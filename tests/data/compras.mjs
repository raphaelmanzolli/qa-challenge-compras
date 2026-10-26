// Cada entrada representa uma execução independente, com os demais campos válidos.
export const invalidPurchases = [
  { name: 'quantidade zero', fields: { quantidade: 0 }, status: 422 },
  { name: 'quantidade negativa', fields: { quantidade: -1 }, status: 422 },
  { name: 'quantidade acima do limite', fields: { quantidade: 101 }, status: 422 },
  { name: 'quantidade fracionária', fields: { quantidade: 1.5 }, status: 400 },
  { name: 'valor zero', fields: { valorMaximoUnitario: 0 }, status: 422 },
  { name: 'valor negativo', fields: { valorMaximoUnitario: -0.01 }, status: 422 },
  { name: 'valor acima do teto', fields: { valorMaximoUnitario: 1000000.01 }, status: 422 },
  { name: 'valor com três casas', fields: { valorMaximoUnitario: 1.001 }, status: 422 },
  { name: 'objeto vazio', fields: { objeto: '' }, status: 422 },
  { name: 'objeto curto', fields: { objeto: 'abcd' }, status: 422 },
  { name: 'objeto longo', fields: { objeto: 'a'.repeat(121) }, status: 422 },
  { name: 'descrição longa', fields: { descricao: 'a'.repeat(501) }, status: 422 },
];

export const purchaseLimits = [
  {
    name: 'mínimos',
    fields: { objeto: 'abcde', descricao: '', quantidade: 1, valorMaximoUnitario: 0.01 },
  },
  {
    name: 'máximos',
    fields: {
      objeto: 'a'.repeat(120),
      descricao: 'a'.repeat(500),
      quantidade: 100,
      valorMaximoUnitario: 1000000,
    },
  },
];
