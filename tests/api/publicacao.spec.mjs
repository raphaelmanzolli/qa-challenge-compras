import { test, expect } from '@playwright/test';
import { login, createPurchase, detail, bids, publishPurchase, sendBid } from '../support/api.mjs';

test('API-06 | preservar publicação e recusar lance antecipado', async ({ request }) => {
  const { buyer, supplier, purchase } =
    await test.step('Preparação: criar compra e autenticar perfis', async () => {
      const buyer = await login(request, 'comprador');
      const supplier = await login(request, 'fornecedor.a');
      const purchase = await createPurchase(request, buyer);
      return { buyer, supplier, purchase };
    });

  const published = await test.step('Ação: publicar o rascunho', async () => {
    const response = await publishPurchase(request, buyer, purchase.id);
    expect(response.status()).toBe(200);
    return response.json();
  });

  await test.step('Validação: recusar repetição e lance antes da abertura', async () => {
    expect(published.status).toBe('AGENDADA');
    expect((await publishPurchase(request, buyer, purchase.id)).status()).toBe(409);
    expect((await sendBid(request, supplier, purchase.id, 450)).status()).toBe(409);
    expect(await bids(request, buyer, purchase.id)).toHaveLength(0);

    const saved = await detail(request, buyer, purchase.id);
    expect(saved.opensAt).toBe(published.opensAt);
    expect(saved.closesAt).toBe(published.closesAt);
  });
});
