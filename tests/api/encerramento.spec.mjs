import { test, expect } from '@playwright/test';
import { login, createPurchase, detail, waitStatus, publishPurchase } from '../support/api.mjs';

test('API-09 | encerrar sem lances como DESERTA e impedir homologação', async ({ request }) => {
  const { buyer, supplier, purchase } =
    await test.step('Preparação: criar rascunho sem lances', async () => {
      const buyer = await login(request, 'comprador');
      const supplier = await login(request, 'fornecedor.a');
      const purchase = await createPurchase(request, buyer);
      return { buyer, supplier, purchase };
    });
  const endpoint = `/api/compras/${purchase.id}/homologar`;

  await test.step('Recusar homologação em rascunho e durante a disputa', async () => {
    expect((await request.post(endpoint, { headers: buyer.headers })).status()).toBe(409);
    expect((await publishPurchase(request, buyer, purchase.id)).status()).toBe(200);
    await waitStatus(request, buyer, purchase.id, 'ABERTA', 30_000);
    expect((await request.post(endpoint, { headers: buyer.headers })).status()).toBe(409);
    expect((await request.post(endpoint, { headers: supplier.headers })).status()).toBe(403);
  });

  await test.step('Aguardar encerramento automático sem lances', async () => {
    await waitStatus(request, buyer, purchase.id, 'DESERTA');
  });

  await test.step('Validação: rejeitar homologação e preservar estado DESERTA', async () => {
    const response = await request.post(endpoint, { headers: buyer.headers });
    // O contrato cita conflito de estado (409) e ausência de lances (422).
    expect([409, 422]).toContain(response.status());
    expect((await detail(request, buyer, purchase.id)).status).toBe('DESERTA');
  });
});
