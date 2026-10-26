import { test, expect } from '@playwright/test';
import { login, createPurchase, purchaseData, detail } from '../support/api.mjs';

test.describe('Permissões de acesso', () => {
  test('API-04 | fornecedor não cria, publica ou consulta rascunho', async ({ request }) => {
    const { buyer, supplier, purchase } =
      await test.step('Preparação: autenticar perfis e criar rascunho', async () => {
        const buyer = await login(request, 'comprador');
        const supplier = await login(request, 'fornecedor.a');
        const purchase = await createPurchase(request, buyer);
        return { buyer, supplier, purchase };
      });

    await test.step('Ação e validação: recusar operações do fornecedor', async () => {
      const create = await request.post('/api/compras', {
        headers: supplier.headers,
        data: purchaseData(),
      });
      expect(create.status()).toBe(403);

      const read = await request.get(`/api/compras/${purchase.id}`, { headers: supplier.headers });
      expect(read.status()).toBe(404);

      const publish = await request.post(`/api/compras/${purchase.id}/publicar`, {
        headers: supplier.headers,
      });
      expect(publish.status()).toBe(403);
    });

    await test.step('Validação: preservar o rascunho original', async () => {
      expect((await detail(request, buyer, purchase.id)).status).toBe('RASCUNHO');
    });
  });

  test('API-05 | recusar acesso sem token e com token inválido', async ({ request }) => {
    for (const headers of [{}, { Authorization: 'Bearer invalido' }]) {
      await test.step(
        headers.Authorization ? 'Token inválido: retornar 401' : 'Sem token: retornar 401',
        async () => {
          const response = await request.get('/api/compras', { headers });
          expect(response.status()).toBe(401);
        },
      );
    }
  });
});
