import { expect } from '@playwright/test';
import { password } from './settings.mjs';

export async function login(api, loginName) {
  const response = await api.post('/api/auth/login', {
    data: { login: loginName, senha: password() },
    maxRedirects: 0,
  });
  expect(response.status(), `Login de ${loginName}`).toBe(200);
  const body = await response.json();
  expect(body.token).toEqual(expect.any(String));
  return { headers: { Authorization: `Bearer ${body.token}` }, usuario: body.usuario };
}

export function purchaseData(overrides = {}) {
  return {
    objeto: `QA cadeiras ${crypto.randomUUID()}`,
    descricao: 'Dados fictícios criados pela automação',
    quantidade: 4,
    valorMaximoUnitario: 450,
    ...overrides,
  };
}

export async function createPurchase(api, buyer, overrides = {}) {
  const response = await api.post('/api/compras', {
    headers: buyer.headers,
    data: purchaseData(overrides),
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  expect(body.id).toEqual(expect.any(String));
  expect(body.status).toBe('RASCUNHO');
  return body;
}

export async function detail(api, user, id) {
  const response = await api.get(`/api/compras/${id}`, { headers: user.headers });
  expect(response.status()).toBe(200);
  return response.json();
}

export async function waitStatus(api, user, id, status, timeout = 90_000) {
  // Consulta o estado efetivo do backend; o relógio do navegador não autoriza lances.
  await expect
    .poll(async () => (await detail(api, user, id)).status, {
      message: `Compra ${id} deve atingir ${status}`,
      intervals: [200, 500, 1000],
      timeout,
    })
    .toBe(status);
}

export async function bids(api, user, id) {
  const response = await api.get(`/api/compras/${id}/lances`, { headers: user.headers });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body), 'Contrato: histórico de lances como lista JSON').toBe(true);
  return body;
}

// Retornam a resposta para o cenário conferir tanto sucesso quanto rejeição.
export function publishPurchase(api, user, id) {
  return api.post(`/api/compras/${id}/publicar`, { headers: user.headers });
}

export function sendBid(api, user, id, value) {
  return api.post(`/api/compras/${id}/lances`, {
    headers: user.headers,
    data: { valorUnitario: value },
  });
}
