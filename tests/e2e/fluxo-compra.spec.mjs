import { expect } from '@playwright/test';
import { test } from '../support/sessions.mjs';
import { login, createPurchase, detail, waitStatus, bids, sendBid } from '../support/api.mjs';
import { purchaseFlows } from '../data/fluxo-compra.mjs';
import { attachJson } from '../support/evidence.mjs';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

for (const scenario of purchaseFlows) {
  const [firstBid, secondBid] = scenario.lances;
  const { expected } = scenario;

  test(`E2E-01 | publicação, disputa e homologação — ${scenario.name}`, async ({
    openSession,
    request,
  }, testInfo) => {
    const { buyer, supplier, purchase, buyerPage, firstSupplierPage, secondSupplierPage } =
      await test.step('Preparação: criar compra e sessões isoladas por perfil', async () => {
        const buyer = await login(request, 'comprador');
        const supplier = await login(request, firstBid.login);
        const purchase = await createPurchase(request, buyer, {
          quantidade: scenario.quantidade,
          valorMaximoUnitario: scenario.valorMaximoUnitario,
        });
        await attachJson(testInfo, 'compra-criada', purchase);

        const buyerPage = await openSession('comprador', purchase);
        const firstSupplierPage = await openSession(firstBid.login, purchase);
        const secondSupplierPage = await openSession(secondBid.login, purchase);
        return { buyer, supplier, purchase, buyerPage, firstSupplierPage, secondSupplierPage };
      });

    await test.step('Ação: publicar compra pela interface', async () => {
      await buyerPage.goto();
      const response = await buyerPage.publish();

      await test.step('Validação: conferir agendamento e prazos', async () => {
        expect(response.status(), await response.text()).toBe(200);
        const published = await response.json();
        expect(published.status).toBe('AGENDADA');
        expect(Number.isFinite(Date.parse(published.opensAt))).toBe(true);
        expect(Date.parse(published.closesAt)).toBeGreaterThan(Date.parse(published.opensAt));
      });
    });

    const bidButton = firstSupplierPage.page.getByRole('button', {
      name: 'Enviar lance',
      exact: true,
    });
    await test.step('Validação: habilitar lances na abertura sem recarregar a página', async () => {
      await firstSupplierPage.gotoDispute();
      await expect(firstSupplierPage.page.getByText('AGENDADA', { exact: true })).toBeVisible();
      await expect(bidButton).toBeDisabled();
      await waitStatus(request, buyer, purchase.id, 'ABERTA', 30_000);
      await expect(firstSupplierPage.page.getByText('ABERTA', { exact: true })).toBeVisible();
      await expect(bidButton).toBeEnabled();
    });

    await test.step(`Ação: ${firstBid.nome} envia o primeiro lance`, async () => {
      const response = await firstSupplierPage.sendBid(firstBid.valor);

      await test.step('Validação: conferir aceitação e exibição do primeiro lance', async () => {
        expect(response.status(), await response.text()).toBe(201);
        const savedBid = await response.json();
        expect(Number(savedBid.valorUnitario)).toBe(firstBid.valor);
        expect(savedBid.fornecedorNome).toBe(firstBid.nome);
        await expect(firstSupplierPage.lowestBid).toHaveText(currency.format(firstBid.valor));
      });
    });

    let winningBid;
    await test.step(`Ação: ${secondBid.nome} envia um lance menor`, async () => {
      await secondSupplierPage.gotoDispute();
      const response = await secondSupplierPage.sendBid(secondBid.valor);

      await test.step('Validação: conferir aceitação e atualização do menor lance', async () => {
        expect(response.status(), await response.text()).toBe(201);
        winningBid = await response.json();
        expect(Number(winningBid.valorUnitario)).toBe(secondBid.valor);
        expect(winningBid.fornecedorNome).toBe(secondBid.nome);
        await expect(secondSupplierPage.lowestBid).toHaveText(currency.format(expected.unitPrice));
      });
    });

    await test.step('Ação: recarregar disputa do primeiro fornecedor', async () => {
      await firstSupplierPage.page.reload();

      await test.step('Validação: conferir histórico e menor lance após refresh', async () => {
        const history = await bids(request, supplier, purchase.id);
        expect(history).toHaveLength(scenario.lances.length);
        expect(history.map((bid) => Number(bid.valorUnitario))).toEqual(
          expect.arrayContaining([firstBid.valor, secondBid.valor]),
        );
        expect(history.map((bid) => bid.id)).toContain(winningBid.id);
        expect(history[0].id).toBe(winningBid.id);
        expect(Date.parse(history[0].createdAt)).toBeGreaterThanOrEqual(
          Date.parse(history[1].createdAt),
        );
        const rows = firstSupplierPage.page
          .getByRole('region', { name: 'Histórico de lances', exact: true })
          .locator('tbody tr');
        await expect(rows).toHaveCount(history.length);
        for (const [index, bid] of history.entries()) {
          const row = rows.nth(index);
          await expect(row.getByRole('cell').nth(0)).toHaveText(String(bid.sequencia));
          await expect(row.getByRole('cell').nth(2)).toContainText(bid.fornecedorNome);
          await expect(row.getByRole('cell').nth(3)).toHaveText(currency.format(bid.valorUnitario));
          await expect(row.locator('time')).toHaveAttribute('datetime', bid.createdAt);
          const displayedTime = await firstSupplierPage.page.evaluate(
            (date) =>
              new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(new Date(date)),
            bid.createdAt,
          );
          await expect(row.locator('time')).toHaveText(displayedTime);
        }
        await expect(firstSupplierPage.lowestBid).toHaveText(currency.format(expected.unitPrice));
      });
    });

    await test.step('Ação: aguardar encerramento e solicitar homologação', async () => {
      await waitStatus(request, buyer, purchase.id, 'ENCERRADA');
      await expect(firstSupplierPage.page.getByText('ENCERRADA', { exact: true })).toBeVisible();
      await expect(bidButton).toBeDisabled();
      await buyerPage.goto();
      await buyerPage.openConfirmation();

      await test.step('Validação: exigir confirmação em modal', async () => {
        await expect(buyerPage.confirmation).toBeVisible();
      });
    });

    await test.step('Ação: confirmar homologação', async () => {
      const response = await buyerPage.confirmHomologation();

      await test.step('Validação: conferir homologação e vencedor persistido', async () => {
        expect(response.status(), await response.text()).toBe(200);
        const result = await detail(request, buyer, purchase.id);
        expect(result.status).toBe('HOMOLOGADA');
        expect(result.vencedor).toBeTruthy();
        expect(result.vencedor.lanceId).toBe(winningBid.id);
        expect(result.vencedor.fornecedorNome).toBe(expected.winner);
        expect(Number(result.vencedor.valorUnitario)).toBe(expected.unitPrice);
        expect(Number(result.vencedor.valorTotal)).toBe(expected.total);
        expect(Number.isFinite(Date.parse(result.homologatedAt))).toBe(true);
        await attachJson(testInfo, 'resultado-final', result);
      });
    });

    const winnerText = `Vencedor: ${expected.winner} com ${currency.format(expected.unitPrice)} por unidade (total ${currency.format(expected.total)}).`;
    await test.step(`Ação: consultar resultado como ${secondBid.nome}`, async () => {
      await secondSupplierPage.gotoResult();

      await test.step('Validação: conferir fornecedor, valor unitário e total no resultado', async () => {
        await expect(secondSupplierPage.winner).toHaveText(winnerText);
      });
    });

    await test.step('Ação: recarregar resultado', async () => {
      await secondSupplierPage.page.reload();

      await test.step('Validação: preservar vencedor exibido após refresh', async () => {
        await expect(secondSupplierPage.winner).toHaveText(winnerText);
        await testInfo.attach('tela-resultado', {
          body: await secondSupplierPage.page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      });
    });

    await test.step('Ação: tentar homologação repetida e lance tardio', async () => {
      const repeat = await request.post(`/api/compras/${purchase.id}/homologar`, {
        headers: buyer.headers,
      });
      const late = await sendBid(request, supplier, purchase.id, scenario.lanceTardio);

      await test.step('Validação: rejeitar novas operações e preservar os lances', async () => {
        expect(repeat.status()).toBe(409);
        expect(late.status()).toBe(409);
        expect(await bids(request, buyer, purchase.id)).toHaveLength(scenario.lances.length);
      });
    });
  });
}
