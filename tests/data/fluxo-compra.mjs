export const purchaseFlows = [
  {
    name: 'valores inteiros, fornecedor Beta vencedor',
    quantidade: 4,
    valorMaximoUnitario: 450,
    lances: [
      { login: 'fornecedor.a', nome: 'Fornecedor Alpha', valor: 450 },
      { login: 'fornecedor.b', nome: 'Fornecedor Beta', valor: 449 },
    ],
    lanceTardio: 448,
    expected: {
      winner: 'Fornecedor Beta',
      unitPrice: 449,
      total: 1796,
    },
  },
  {
    name: 'valores com centavos, fornecedor Alpha vencedor',
    quantidade: 3,
    valorMaximoUnitario: 120.5,
    lances: [
      { login: 'fornecedor.b', nome: 'Fornecedor Beta', valor: 120.5 },
      { login: 'fornecedor.a', nome: 'Fornecedor Alpha', valor: 119.5 },
    ],
    lanceTardio: 118.5,
    expected: {
      winner: 'Fornecedor Alpha',
      unitPrice: 119.5,
      total: 358.5,
    },
  },
];
