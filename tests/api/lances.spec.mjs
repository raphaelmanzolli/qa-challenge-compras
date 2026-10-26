import { test, expect } from '@playwright/test';
import {
  login,
  createPurchase,
  waitStatus,
  bids,
  publishPurchase,
  sendBid,
} from '../support/api.mjs';
import { attachJson, responseEvidence } from '../support/evidence.mjs';

test.describe('Lances e concorrência', () => {
  test('API-07 | aplicar limites de lance sem persistir rejeições', async ({
    request,
  }, testInfo) => {
    const { buyer, supplier, purchase } =
      await test.step('Preparação: abrir compra própria', async () => {
        const buyer = await login(request, 'comprador');
        const supplier = await login(request, 'fornecedor.a');
        const purchase = await createPurchase(request, buyer);
        expect((await publishPurchase(request, buyer, purchase.id)).status()).toBe(200);
        await waitStatus(request, buyer, purchase.id, 'ABERTA', 30_000);
        return { buyer, supplier, purchase };
      });

    await test.step('Recusar órgão, zero, negativo e valor acima do teto', async () => {
      expect((await sendBid(request, buyer, purchase.id, 450)).status()).toBe(403);
      for (const value of [0, -1, 450.01]) {
        expect((await sendBid(request, supplier, purchase.id, value)).status()).toBe(422);
      }
      expect(await bids(request, buyer, purchase.id)).toHaveLength(0);
    });

    await test.step('Aceitar primeiro lance no teto de 450', async () => {
      expect((await sendBid(request, supplier, purchase.id, 450)).status()).toBe(201);
    });

    await test.step('Recusar igualdade e redução inferior a 1 real', async () => {
      for (const value of [450, 449.01]) {
        const response = await sendBid(request, supplier, purchase.id, value);
        await attachJson(testInfo, `rejeicao-${value}`, {
          compraId: purchase.id,
          valor: value,
          ...(await responseEvidence(response)),
          historico: await bids(request, buyer, purchase.id),
        });
        // Continua coletando evidências, mas mantém o teste reprovado se houver 500.
        expect.soft(response.status()).toBe(422);
      }
      expect(await bids(request, buyer, purchase.id)).toHaveLength(1);
    });

    await test.step('Aceitar redução de 1 real e conferir o histórico', async () => {
      expect((await sendBid(request, supplier, purchase.id, 449)).status()).toBe(201);
      const saved = await bids(request, buyer, purchase.id);
      const values = saved.map((bid) => Number(bid.valorUnitario)).sort((a, b) => a - b);
      expect(values).toEqual([449, 450]);
    });
  });

  test('API-08 | aceitar somente um de dois lances simultâneos iguais', async ({
    request,
  }, testInfo) => {
    const { buyer, suppliers, purchase } =
      await test.step('Preparação: abrir compra para dois fornecedores', async () => {
        const buyer = await login(request, 'comprador');
        const suppliers = [
          await login(request, 'fornecedor.a'),
          await login(request, 'fornecedor.b'),
        ];
        const purchase = await createPurchase(request, buyer);
        expect((await publishPurchase(request, buyer, purchase.id)).status()).toBe(200);
        await waitStatus(request, buyer, purchase.id, 'ABERTA', 30_000);
        return { buyer, suppliers, purchase };
      });

    const responses = await test.step('Ação: enviar dois lances de 450 simultaneamente', () =>
      Promise.all(suppliers.map((supplier) => sendBid(request, supplier, purchase.id, 450))));

    await test.step('Validação: uma aceitação, uma rejeição e um único registro', async () => {
      const saved = await bids(request, buyer, purchase.id);
      await attachJson(testInfo, 'concorrencia-e-persistencia', {
        compraId: purchase.id,
        respostas: await Promise.all(responses.map(responseEvidence)),
        historico: saved,
      });
      expect.soft(responses.map((response) => response.status()).sort()).toEqual([201, 422]);
      expect(saved).toHaveLength(1);
      expect(Number(saved[0].valorUnitario)).toBe(450);
    });
  });
});
