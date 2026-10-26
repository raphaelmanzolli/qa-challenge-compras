# Registro dos testes manuais — 24/10/2026

Execução entre 14:29 e 14:36, America/Sao_Paulo. Windows 11 Pro, Docker Engine 29.9.2, Compose v5.6.1, imagem `qa-challenge-compras:1.0`. Abertura em 10 s, disputa de 45 s e atualização de 2 s. Comprador e dois fornecedores em sessões separadas, com dados próprios.

**22 aprovados, 1 reprovado, 9 parciais, 10 não executados e 2 bloqueados por massa.** Este registro se refere aos casos manuais dessa data. Os resultados da suíte estão na [automação](../../docs/02-automacao.md).

As capturas e respostas citadas na tabela estão nesta pasta. Os números identificam o prefixo dos arquivos; as consultas HTTP estão em [api-complementar.json](api-complementar.json). [Plano com os resultados esperados](../../docs/01-plano-de-testes.md).

## Situação por caso do plano

“Aprovado” se refere ao escopo descrito no caso. “Parcial” indica variações ou camadas pendentes e não conta como aprovação integral. IDs ausentes das evidências não foram inferidos como executados.

| Caso   | Situação            | Observação / evidência                                                                                     |
| ------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| CT-001 | Aprovado            | Cadastro, refresh, IDs/códigos distintos nas compras 306–309; 01-rascunho.png                              |
| CT-002 | Aprovado            | Todas as variações de quantidade; 16–18, 26, 31–32                                                         |
| CT-003 | Aprovado            | Todas as variações do campo unitário; 19–20, 23, 26, 29–30, 33; não confundir com exibição do total        |
| CT-004 | Aprovado            | Vazio, 4/5 e 120/121; 21–23, 26–27                                                                         |
| CT-005 | Aprovado            | Omitida, 500 e 501; 23, 26, 28                                                                             |
| CT-006 | Reprovado           | BUG-001, total com centavos incorreto no detalhe; 23–25 e API                                              |
| CT-007 | Aprovado            | Rascunho → AGENDADA com datas; 03-agendada.png e auditoria                                                 |
| CT-008 | Parcial             | Repetição após homologação: 409; falta duplo envio e comparação específica dos eventos                     |
| CT-009 | Não executado       | Edição após publicação pendente                                                                            |
| CT-010 | Aprovado            | UI sem cadastro para fornecedor; API criar/publicar 403; 34 e API                                          |
| CT-011 | Aprovado            | Rascunho 404 e busca sem resultados para fornecedor; 02 e API                                              |
| CT-012 | Bloqueado por massa | Segundo órgão não disponível                                                                               |
| CT-013 | Aprovado            | Primeiro lance no teto 450 aceito; 06 e API                                                                |
| CT-014 | Não executado       | Zero, negativo e acima do teto em lances pendentes                                                         |
| CT-015 | Parcial             | 449.01 recusado e 449 aceito; faltam igualdade a 450 e redução para 448.99 em massas independentes         |
| CT-016 | Aprovado            | A=450, B=449, A=448; 06, 08 e API                                                                          |
| CT-017 | Parcial             | UI bloqueou AGENDADA/ENCERRADA; API bloqueou DESERTA/HOMOLOGADA; falta verificar todos os estados pela API |
| CT-018 | Parcial             | UI do órgão sem lance; falta tentativa API durante ABERTA                                                  |
| CT-019 | Aprovado            | Valores, horários, fornecedores, ordem e refresh; 08, 14–15 e API                                          |
| CT-020 | Não executado       | Concorrência simultânea com valores iguais pendente                                                        |
| CT-021 | Não executado       | Concorrência simultânea com valores distintos pendente                                                     |
| CT-022 | Aprovado            | Lance 449.01 não consta em histórico/auditoria; rejeições posteriores não alteraram classificação          |
| CT-023 | Aprovado            | Abertura automática observada nas sessões e auditoria; 03–06                                               |
| CT-024 | Não executado       | Instante exato de fronteira não comprovado                                                                 |
| CT-025 | Aprovado            | Encerramento com lances e menor preservado; 10–11                                                          |
| CT-026 | Aprovado            | DESERTA sem lances e sem vencedor; 35 e API                                                                |
| CT-027 | Parcial             | Detalhe/disputa atualizaram sem refresh; falta listagem durante transição                                  |
| CT-028 | Não executado       | Alteração do relógio do cliente pendente                                                                   |
| CT-029 | Não executado       | Todos os filtros e páginas pendentes                                                                       |
| CT-030 | Parcial             | Refresh preservou dados observados; não houve campanha de vários refreshes com comparação de eventos       |
| CT-031 | Não executado       | Limites da paginação/parâmetros pendentes                                                                  |
| CT-032 | Aprovado            | Alpha vence por 448, ID igual ao menor lance; 14–15 e API                                                  |
| CT-033 | Aprovado            | Fornecedor sem homologação na UI consultada e 403 na API                                                   |
| CT-034 | Parcial             | RASCUNHO 409; faltam AGENDADA e ABERTA                                                                     |
| CT-035 | Aprovado            | DESERTA não homologou; HTTP 422; API                                                                       |
| CT-036 | Aprovado            | Cancelamento preservou estado; confirmação persistiu data e lance vencedor; 12–14 e API                    |
| CT-037 | Aprovado            | Homologação repetida/lance tardio 409 e resultado preservado; API                                          |
| CT-038 | Aprovado            | Auditoria da compra 306 contém os oito eventos esperados, autores e horários; 14.txt e API                 |
| CT-039 | Aprovado            | Resultado acessível ao fornecedor, vencedor/valor coerentes após refresh; 15 e API                         |
| CT-040 | Não executado       | PDF não baixado/conferido nesta rodada                                                                     |
| CT-041 | Bloqueado por massa | Segundo órgão não disponível                                                                               |
| CT-042 | Parcial             | Três perfis entraram na UI; senha inválida 401 na API; falta login inexistente                             |
| CT-043 | Parcial             | Sem token/inválido 401; expiração e fluxo de UI pendentes                                                  |
| CT-044 | Não executado       | Recurso inexistente/JSON malformado e contrato completo de erros pendentes                                 |

