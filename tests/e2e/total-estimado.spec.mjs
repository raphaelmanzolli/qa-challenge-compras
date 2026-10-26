import { test, expect } from '@playwright/test';
import { login, createPurchase, detail } from '../support/api.mjs';
import { LoginPage } from '../page-objects/login-page.mjs';
import { CompraPage } from '../page-objects/compra-page.mjs';
import { attachJson } from '../support/evidence.mjs';

for (const data of [
  { quantidade: 1, valorMaximoUnitario: 0.01, total: 0.01, formatted: /R\$\s*0,01/ },
  { quantidade: 3, valorMaximoUnitario: 0.1, total: 0.3, formatted: /R\$\s*0,30/ },
  { quantidade: 3, valorMaximoUnitario: 120.5, total: 361.5, formatted: /R\$\s*361,50/ },
  { quantidade: 4, valorMaximoUnitario: 450, total: 1800, formatted: /R\$\s*1\.800,00/ },
]) {
  test(`REG-001 | BUG-001: total de ${data.quantidade} × ${data.valorMaximoUnitario}`, async ({
    page,
    request,
  }, testInfo) => {
    testInfo.annotations.push({
      type: 'bug',
      description: 'BUG-001 aberto: manter a expectativa correta, sem expected-failure ou skip.',
    });

    const { purchase, saved, compraPage } =
      await test.step('Preparação: criar compra com a massa do caso e autenticar comprador', async () => {
        const buyer = await login(request, 'comprador');
        const purchase = await createPurchase(request, buyer, {
          quantidade: data.quantidade,
          valorMaximoUnitario: data.valorMaximoUnitario,
        });
        const saved = await detail(request, buyer, purchase.id);
        expect(Number(saved.valorTotalEstimado)).toBe(data.total);
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login('comprador');
        const compraPage = new CompraPage(page, purchase);
        return { purchase, saved, compraPage };
      });

    await test.step('Ação: abrir detalhe da compra', async () => {
      await compraPage.goto();
    });

    await test.step('Validação: conferir total da interface com cálculo e API', async () => {
      await expect(compraPage.estimatedTotal).toBeVisible();
      // Mantém a reprovação e permite coletar evidências após a asserção terminar.
      await expect.soft(compraPage.estimatedTotal).toHaveText(data.formatted);

      const displayedTotal = await compraPage.estimatedTotal.innerText({ timeout: 1000 });
      await attachJson(testInfo, 'comparacao-total', {
        compraId: purchase.id,
        codigo: purchase.codigo,
        quantidade: data.quantidade,
        valorUnitario: data.valorMaximoUnitario,
        esperado: data.total,
        api: saved.valorTotalEstimado,
        tela: displayedTotal,
        capturadoEm: new Date().toISOString(),
      });
    });
  });
}
