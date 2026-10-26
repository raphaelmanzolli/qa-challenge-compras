import { test, expect } from '@playwright/test';
import { login, createPurchase } from '../support/api.mjs';
import { attachJson } from '../support/evidence.mjs';

test('API-10 | BUG-005: buscar por objeto preserva o termo ao filtrar por status', async ({
  request,
}, testInfo) => {
  const { buyer, marker, matching, unrelated } =
    await test.step('Preparação: criar uma compra correspondente e outra sem o termo buscado', async () => {
      const buyer = await login(request, 'comprador');
      const marker = `QA busca ${crypto.randomUUID()}`;
      const matching = await createPurchase(request, buyer, { objeto: marker });
      const unrelated = await createPurchase(request, buyer);
      return { buyer, marker, matching, unrelated };
    });

  for (const params of [{ q: marker }, { q: marker, status: 'RASCUNHO' }]) {
    await test.step(`Ação e validação: buscar ${params.status ? 'com status' : 'sem status (controle)'}`, async () => {
      const response = await request.get('/api/compras', { headers: buyer.headers, params });
      expect(response.status()).toBe(200);
      const body = await response.json();
      await attachJson(testInfo, `busca-${params.status || 'sem-status'}`, {
        params,
        esperado: [matching.id],
        compraSemCorrespondencia: unrelated.id,
        resposta: body,
      });
      expect(body.content.map((purchase) => purchase.id)).toEqual([matching.id]);
    });
  }
});
