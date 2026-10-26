import { test, expect } from '@playwright/test';
import { login, createPurchase, purchaseData, detail } from '../support/api.mjs';
import { invalidPurchases, purchaseLimits } from '../data/compras.mjs';

test.describe('Cadastro de compras', () => {
  let buyer;

  test.beforeEach(async ({ request }) => {
    buyer = await test.step('Preparação: autenticar comprador', () => login(request, 'comprador'));
  });

  test('API-01 | criar rascunhos com identidade e dados persistidos', async ({ request }) => {
    const [first, second] = await test.step('Ação: cadastrar duas compras', async () => [
      await createPurchase(request, buyer),
      await createPurchase(request, buyer),
    ]);

    await test.step('Validação: conferir identidade, status e persistência', async () => {
      expect(first.id).not.toBe(second.id);
      expect(first.codigo).toEqual(expect.any(String));
      expect(first.codigo).not.toBe(second.codigo);

      const saved = await detail(request, buyer, first.id);
      expect(saved.status).toBe('RASCUNHO');
      expect(saved.quantidade).toBe(4);
      expect(Number(saved.valorMaximoUnitario)).toBe(450);
      expect(saved.objeto).toBe(first.objeto);
    });
  });

  for (const scenario of invalidPurchases) {
    test(`API-02 | rejeitar ${scenario.name}`, async ({ request }) => {
      const response = await test.step('Ação: enviar cadastro fora da regra', () =>
        request.post('/api/compras', {
          headers: buyer.headers,
          data: purchaseData(scenario.fields),
        }));

      await test.step('Validação: conferir rejeição e diagnóstico', async () => {
        expect(response.status(), await response.text()).toBe(scenario.status);
        const error = await response.json();
        expect(error.code).toEqual(expect.any(String));
        expect(error.message).toEqual(expect.any(String));
        expect(response.headers()['x-trace-id']).toBeTruthy();
      });
    });
  }

  for (const scenario of purchaseLimits) {
    test(`API-03 | aceitar limites ${scenario.name}`, async ({ request }) => {
      const purchase = await test.step('Ação: cadastrar nos limites permitidos', () =>
        createPurchase(request, buyer, scenario.fields));

      await test.step('Validação: conferir valores persistidos', async () => {
        const saved = await detail(request, buyer, purchase.id);
        expect(saved.quantidade).toBe(scenario.fields.quantidade);
        expect(Number(saved.valorMaximoUnitario)).toBe(scenario.fields.valorMaximoUnitario);
        expect(saved.objeto).toBe(scenario.fields.objeto);
      });
    });
  }
});
