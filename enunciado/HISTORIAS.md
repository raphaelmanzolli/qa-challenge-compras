# Histórias de usuário — QA Challenge: Compras Diretas

Ambiente fictício e didático: sem compras reais, sem dados pessoais reais e sem pagamentos.

### HU01 — Cadastrar e publicar uma Compra Direta

**Como** usuário do órgão responsável pela compra, **quero** cadastrar um objeto de aquisição e publicá-lo, **para** disponibilizar uma disputa aos fornecedores.

**Critérios de aceitação**

- **CA01:** usuário `ORGAO` autenticado pode criar compra informando objeto, descrição opcional, quantidade e valor máximo unitário.
- **CA02:** compra criada inicia como `RASCUNHO` e recebe código e ID únicos.
- **CA03:** quantidade deve ser inteiro de 1 a 100 e valor máximo unitário deve ser maior que zero, com no máximo duas casas, até R$ 1.000.000,00.
- **CA04:** objeto é obrigatório, de 5 a 120 caracteres, e descrição tem no máximo 500 caracteres.
- **CA05:** o valor total estimado exibido é quantidade multiplicada pelo valor máximo unitário.
- **CA06:** apenas o órgão criador pode publicar uma compra em rascunho.
- **CA07:** publicar define `opensAt` e `closesAt` e muda o estado efetivo para `AGENDADA` até o início.
- **CA08:** não é permitido publicar a mesma compra duas vezes, nem editar os dados após a publicação.
- **CA09:** fornecedores não podem criar/publicar compras e não acessam rascunhos de outros papéis.

**Exemplos de análise esperada:** mínimo/máximo, campo vazio, valor decimal, duplicação de publicação, autorização via interface e API, persistência após refresh.

### HU02 — Registrar lances como fornecedor

**Como** fornecedor autenticado, **quero** enviar lances durante uma disputa aberta, **para** competir com outras propostas pelo fornecimento.

**Critérios de aceitação**

- **CA01:** um fornecedor pode enviar seu primeiro lance enquanto a disputa está `ABERTA`, desde que o valor seja positivo e menor ou igual ao máximo unitário.
- **CA02:** cada novo lance deve ser no mínimo R$ 1,00 inferior ao menor lance válido já registrado, independentemente do fornecedor.
- **CA03:** lances enviados em `AGENDADA`, `ENCERRADA`, `DESERTA` ou `HOMOLOGADA` são recusados.
- **CA04:** usuário `ORGAO` não pode enviar lances.
- **CA05:** lance aceito é persistido, visível no histórico e altera o menor lance exibido.
- **CA06:** lances inválidos devem ser rejeitados com resposta de erro de negócio adequada, sem persistência.
- **CA07:** dois fornecedores podem disputar a mesma compra, inclusive por sessões de navegador separadas.
- **CA08:** em envios concorrentes, o backend deve manter consistência da classificação e não aceitar lances conflitantes.
- **CA09:** o histórico preserva fornecedor, valor e horário de cada lance registrado.

**Exemplos de análise esperada:** zero, negativo, igualdade ao melhor lance, redução de R$ 0,99 ou R$ 1,00, envio na virada do prazo, concorrência, refresh e resposta HTTP.

### HU03 — Iniciar e encerrar automaticamente uma disputa

**Como** usuário interessado numa compra publicada, **quero** acompanhar seus estados e prazos, **para** saber quando posso enviar lances e quando o resultado estará disponível.

**Critérios de aceitação**

- **CA01:** compra publicada inicia em `AGENDADA` até `opensAt`, quando passa a `ABERTA` sem intervenção manual.
- **CA02:** disputa permanece aberta somente até `closesAt` (exclusive).
- **CA03:** passado o prazo, havendo lance válido, passa a `ENCERRADA`; sem lances, passa a `DESERTA`.
- **CA04:** telas de listagem e detalhe devem refletir o estado efetivo fornecido pela API, inclusive após refresh.
- **CA05:** o frontend atualiza periodicamente o estado sem exigir recarregamento manual de página.
- **CA06:** o cronômetro é informativo; a autorização de lance deve considerar exclusivamente o horário do backend.
- **CA07:** o filtro por status retorna apenas compras do status selecionado.
- **CA08:** atualizar várias vezes a página não altera prazos ou duplica eventos de abertura/encerramento.

**Exemplos de análise esperada:** espera condicional, intervalos `[abertura, fechamento)`, filtro, carregamento assíncrono, estado vencido, teste sem esperas fixas.

### HU04 — Homologar e consultar o resultado da compra

**Como** usuário do órgão responsável, **quero** homologar uma disputa encerrada, **para** formalizar o fornecedor vencedor e registrar seu resultado.

**Critérios de aceitação**

- **CA01:** somente usuário `ORGAO` dono da compra pode homologar.
- **CA02:** homologação somente é permitida quando o estado efetivo for `ENCERRADA` e houver lance válido.
- **CA03:** o lance vencedor é o de menor valor unitário e o fornecedor associado é mostrado no resultado.
- **CA04:** a homologação exige confirmação em modal e persiste `homologatedAt` e `vencedorLanceId`.
- **CA05:** após homologação, o estado é `HOMOLOGADA`, sem possibilidade de receber lances ou homologar novamente.
- **CA06:** compras `DESERTA` não podem ser homologadas.
- **CA07:** a compra mantém histórico da criação, publicação, lances e homologação, com identificador do responsável e horários.
- **CA08:** fornecedores podem consultar o resultado de uma compra publicada, mas nunca homologá-la.
- **CA09:** a tela de resultado permite baixar um relatório (PDF) da compra; os valores do relatório devem conferir com os exibidos na tela e retornados pela API.

**Exemplos de análise esperada:** pré-condições, passagem por perfis, maior/menor lance, duplicidade, acesso indevido, histórico, sessão expirada, conferência do relatório baixado contra a tela/API.

