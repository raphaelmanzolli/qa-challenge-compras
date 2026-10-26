# Parte B — Automação

Usei Playwright com JavaScript para testar o fluxo de compra e as regras de maior risco: valores, permissões, estados e concorrência. Os comandos de instalação e execução estão no [README](../README.md#rodar-os-testes).

## Resultado — 26/10/2026

**28 testes: 22 aprovados e 6 reprovados.** Execução às 16:31:02 -03:00, duração de 3 min 48 s. Linux, Node.js 22.22.3, Playwright 1.64.1/Chromium e imagem `qa-challenge-compras:1.0`. Um worker, sem retries ou testes ignorados.

| Grupo             | Aprovados | Reprovados |
| ----------------- | --------- | ---------- |
| API               | 19        | 3          |
| Fluxos E2E        | 2         | 0          |
| Totais monetários | 1         | 3          |

As falhas foram:

- **BUG-001:** três massas com centavos exibem total incorreto; a API retorna o valor correto. O controle inteiro passou.
- **BUG-002:** lance igual recebe HTTP 500 em vez de 422.
- **API-08:** lances simultâneos recebem 201/500, com um lance persistido. O teste reprova pelo erro de rejeição; esta execução não reproduziu a duplicidade de BUG-003.
- **BUG-005:** busca funciona sozinha, mas ignora o termo ao combinar `status=RASCUNHO`.

[Resumo e evidências](../resultados/automacao-2026-10-26/resumo.md) · [Resultado por teste](../resultados/automacao-2026-10-26/execucao-integral.json).

## Fluxo completo

O [E2E](../tests/e2e/fluxo-compra.spec.mjs) cria uma compra por API e abre sessões separadas para comprador e dois fornecedores. O comprador publica pela interface; os fornecedores dão lances; após o encerramento, o comprador confirma a homologação.

O teste confere os estados e o botão de lance sem recarregar a página, as respostas HTTP, os lances persistidos, o vencedor e o resultado após refresh. Compara fornecedor, valor e horário de cada linha do histórico com a API, com o lance mais recente primeiro. Também tenta homologar de novo e enviar um lance tardio, esperando rejeição.

São duas massas independentes: quantidade 4 com lances de 450 e 449, vencida por Beta; e quantidade 3 com lances de 120,50 e 119,50, vencida por Alpha. As expectativas estão em [tests/data/fluxo-compra.mjs](../tests/data/fluxo-compra.mjs).

## Organização e escolhas

- `tests/api/`: cadastro, permissões, publicação, lances, encerramento e busca.
- `tests/e2e/`: fluxo completo e comparação do total exibido com cálculo e API.
- `tests/page-objects/`: seletores e ações da interface.
- `tests/support/`: preparação por API, sessões e anexos de evidência.

Os passos separam preparação, ação e validação com `test.step`. Os testes criam seus dados e aguardam o estado do servidor com `expect.poll`, sem depender de compras pré-carregadas ou esperas fixas. Um worker evita concorrência acidental; API-08 envia duas requisições simultâneas de propósito.

Asserções de negócio permanecem corretas mesmo quando o produto falha. `expect.soft` permite guardar a evidência antes de terminar um teste reprovado; não muda seu resultado.

O PDF é conferido manualmente. Fronteira temporal exata, sessão expirada e acesso entre dois órgãos estão entre as [limitações](04-relatorio.md#limitações). A seleção segue o risco e não pretende automatizar todo o plano.

## Consultar os resultados

`npm run report` abre o HTML em `playwright-report/`. Capturas, vídeos e traces ficam em `test-results/`. Para gerar um resumo: `node scripts/resumir-automacao.mjs [entrada.json] [pasta-de-saida]`. Sem argumentos, lê `resultados/playwright.json` e grava em `resultados/automacao-final/`.

O resumo distingue falhas de testes de erros globais. Uma execução interrompida ou sem resultados fica como incompleta. Traces devem ser revisados antes de compartilhar, pois podem conter credenciais demo.
