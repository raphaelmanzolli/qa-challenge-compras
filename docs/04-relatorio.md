# Parte D — Relatório

**26/10/2026 — Recomendo não liberar.** O fluxo completo funciona, mas há informação financeira incorreta e falhas na busca e no tratamento de lances. A carga dentro dos limites não compensa esses problemas.

## Resultado da avaliação

A suíte funcional executou 28 testes: **22 passaram e 6 falharam**. Os dois fluxos E2E passaram. A carga JMeter fez 12 rodadas, com 36.030 requisições, zero erros e maior P95 por rodada de 8,00 ms.

Os resultados detalhados estão em [automação](02-automacao.md) e [performance](03-performance.md). O [registro manual por caso](../resultados/manual-2026-10-24/casos.md) complementa a avaliação; não some suas aprovações às da automação, pois há sobreposição de cobertura.

## Bugs

| Bug                        | Comportamento observado                                     | Severidade / prioridade |
| -------------------------- | ----------------------------------------------------------- | ----------------------- |
| [BUG-001](bugs/BUG-001.md) | Total no detalhe diverge da API em três massas com centavos | Média / P1              |
| [BUG-002](bugs/BUG-002.md) | Lance igual retorna 500 em vez de rejeição de negócio 422   | Média / P1              |
| [BUG-003](bugs/BUG-003.md) | Dois lances iguais simultâneos foram aceitos e persistidos  | Alta / P0               |
| [BUG-004](bugs/BUG-004.md) | Menor lance no PDF diverge da API e da tela                 | Alta / P1               |
| [BUG-005](bugs/BUG-005.md) | Busca ignora o termo quando combinada com status            | Média / P2              |

Na execução funcional de 26/10, API-08 recebeu 201/500 e persistiu um lance. O teste reprovou pela resposta de erro; não reproduziu a duplicidade documentada em BUG-003. O bug permanece aberto. Não foi demonstrado vencedor incorreto nem corrupção dos dados financeiros nos demais casos.

A severidade considera o impacto comprovado; a prioridade indica a ordem de correção. Os relatos incluem passos, ambiente, esperado, obtido e evidências.

## Conferência do PDF

A conferência de 26/10/2026 comparou os PDFs das duas compras do E2E com a API e a tela. No controle inteiro, CD-000466, os valores conferiram. Na compra com centavos, CD-000467, o PDF mostrou menor lance de R$ 120,00, contra R$ 119,50 na API e na tela, reproduzindo BUG-004. Ambos os documentos estavam legíveis, sem cortes ou sobreposições.

[PDF, API, tela e comparação](bugs/BUG-004.md). Essa conferência é manual e não faz parte dos 28 testes automatizados.

## Ambiente

Automação: Linux, Node.js 22.22.3, Playwright 1.64.1/Chromium. Conferência do PDF: Linux/Chromium. O registro manual por caso identifica seu próprio ambiente; o ambiente da carga está na Parte C. Aplicação `qa-challenge-compras:1.0`, banco PostgreSQL 16, em ambiente local.

Os testes funcionais usam abertura em 10 s, disputa de 45 s e atualização de 2 s. A carga amplia a disputa temporariamente e restaura a configuração, preservando os dados.

## Limitações

- Falta um segundo usuário de órgão para verificar acesso entre órgãos distintos.
- Fronteira temporal exata, sessão expirada, alteração do relógio do cliente e algumas variações de consulta não foram cobertas integralmente.
- A carga usa uma compra por usuário; não mede disputa concentrada nem capacidade máxima.

A próxima ação é corrigir e retestar os bugs, começando por BUG-003, e completar os cenários críticos pendentes antes de reavaliar a liberação. A aplicação fornecida não foi alterada e nenhuma expectativa de teste foi relaxada para obter aprovação.
