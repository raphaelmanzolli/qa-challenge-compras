# Execução funcional — 26/10/2026

**28 testes executados: 22 aprovados e 6 reprovados.** Comando: `npm test`. Início: **26/10/2026, 16:31:02.858 -03:00 (19:31:02.858 UTC)**. Duração: 3 min 48 s. Sem erros globais, retries ou testes ignorados. [Registro por teste](execucao-integral.json).

Ambiente: Linux, Node.js 22.22.3, imagem `qa-challenge-compras:1.0`, Playwright 1.64.1/Chromium, um worker. Abertura em 10 s e disputa de 45 s.

| Grupo | Aprovados | Reprovados |
| --- | --- | --- |
| API | 19 | 3 |
| Fluxos E2E | 2 | 0 |
| Totais monetários | 1 | 3 |

Os dois fluxos completos passaram, incluindo habilitação e bloqueio automático do botão de lance, histórico na interface (fornecedor, valor, horário e ordem), homologação, vencedor e persistência após refresh.

Falhas observadas:

- REG-001: três massas decimais exibiram totais incorretos. [1 × 0,01](25-comparacao-total.json), [3 × 0,10](26-comparacao-total.json) e [3 × 120,50](27-comparacao-total.json). Nesta última, API 361,50 e tela 363,00. O [controle 4 × 450](28-comparacao-total.json) passou com 1.800,00.
- API-10: [busca sem status](API-10-busca-sem-status.json) retorna somente o ID esperado; [busca com status](API-10-busca-RASCUNHO.json) inclui outros IDs, reproduzindo BUG-005.
- API-07: [lance igual](18-rejeicao-450.json) recebeu HTTP 500 onde se espera 422.
- API-08: [envio concorrente](19-concorrencia-e-persistencia.json) recebeu 201 e 500, em vez de 201 e 422, com um único lance persistido. A falha desta execução é de rejeição; não demonstra a duplicidade descrita em BUG-003.

O PDF não integra esta suíte. Sua conferência manual está em [BUG-004](../../docs/bugs/BUG-004.md).

A suíte retorna código de saída 1. As expectativas foram mantidas, sem ignorar falhas ou marcá-las como aprovação esperada.
