# Parte A — Plano de testes

## Objetivo e base de teste

O plano cobre cadastro, publicação, disputa, encerramento e homologação, priorizando risco. Os cenários abaixo são planejados; a execução está registrada na [automação](02-automacao.md) e na [matriz manual](../resultados/manual-2026-10-24/casos.md).

Fontes: [histórias](https://github.com/Jonathas-Borges/qa-challenge-compras-candidato/blob/main/HISTORIAS.md), [contrato e ambiente](https://github.com/Jonathas-Borges/qa-challenge-compras-candidato/blob/main/README.md) e [entregáveis](https://github.com/Jonathas-Borges/qa-challenge-compras-candidato/blob/main/DESAFIO.md). Cópias consultadas em 24/10/2026 estão em `enunciado/`.

## Estratégia e prioridades

- **P0 — crítica:** integridade da disputa, autorização, vencedor e prazo; falha pode permitir fraude, acesso indevido ou resultado incorreto. Executar primeiro.
- **P1 — alta:** cadastro, fronteiras, persistência, rastreabilidade e relatório; falha compromete operação ou conferência.
- **P2 — média:** consulta e apresentação sem corrupção imediata; executar após os fluxos críticos.

Prioridade é ordem de execução; severidade será atribuída ao defeito observado. Tipo: POS = positivo; NEG = negativo; FR = fronteira; PER = permissão; EST = estado; CON = concorrência.

Camadas: testes manuais de interface (mensagens, modal, PDF, atualização); API (regras e acesso direto, sem depender de botão oculto); E2E (fluxo entre perfis e tempo); carga local (latência, vazão, erros e persistência).

## Ambiente, dados e preparação

1. Seguir o README, subir app e banco e confirmar `/actuator/health` como `UP`.
2. Registrar sistema operacional, versões Docker/Compose, imagem, navegador, CPU/RAM e variáveis efetivas. Anotar os instantes em UTC e horário local quando necessário.
3. Usar somente `comprador`, `fornecedor.a` e `fornecedor.b`, em contextos separados. Não reaproveitar `sessionStorage` entre perfis.
4. Criar uma compra própria por cenário, com objeto identificável. Base válida: objeto `Aquisição de cadeiras`, descrição `Setor administrativo`, quantidade `4`, valor unitário `450.00`.
5. Identificar registros pelo ID retornado e código. Não fixar UUIDs ou depender da situação inicial das compras pré-carregadas.
6. Para testes temporais: abertura em 10 s, duração de 45 s e polling de 2 s. Conferir `opensAt`, `closesAt` e `serverNow`. Aguardar condição, não um tempo fixo presumido.
7. Manter campos não relacionados ao objetivo válidos. Cada valor listado como variação representa uma execução separada, com registro próprio.

## HU01 — Cadastro e publicação

| ID     | CA    | Tipo    | Preparação / ação / dados                                                           | Resultado esperado                                                                                                                     | Prioridade e risco                       |
| ------ | ----- | ------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| CT-001 | 01,02 | POS     | Comprador cadastra compra base; criar segunda compra                                | Ambas em RASCUNHO; IDs e códigos presentes e distintos; dados persistem após refresh                                                   | P1: fluxo de entrada e identidade        |
| CT-002 | 03    | FR,NEG  | Variar quantidade: -1, 0, 1, 100, 101, 1.5 e vazio                                  | Aceitar somente 1 e 100; rejeitar demais sem criar compra                                                                              | P1: quantidade inválida                  |
| CT-003 | 03    | FR,NEG  | Valor: -0.01, 0, 0.01, 1000000, 1000000.01, 1.001 e vazio                           | Aceitar 0.01 e 1000000; rejeitar demais sem arredondar silenciosamente três casas                                                      | P1: valor inválido                       |
| CT-004 | 04    | FR,NEG  | Objeto: vazio; 4, 5, 120 e 121 caracteres                                           | Aceitar 5 e 120; rejeitar vazio, 4 e 121                                                                                               | P1: cadastro fora da regra               |
| CT-005 | 01,04 | FR,POS  | Omitir descrição; depois usar 500 e 501 caracteres                                  | Ausência e 500 aceitos; 501 recusados                                                                                                  | P2: campo opcional e limite              |
| CT-006 | 05    | POS,FR  | Cadastrar 4 × 450.00 e 3 × 0.10; conferir total na tela e após refresh              | Totais 1800.00 e 0.30 sem erro de ponto flutuante                                                                                      | P1: cálculo monetário                    |
| CT-007 | 06,07 | POS,EST | Comprador publica rascunho próprio                                                  | AGENDADA até abertura; opensAt e closesAt válidos, fechamento posterior à abertura                                                     | P0: início da disputa                    |
| CT-008 | 08    | NEG,EST | Publicar novamente o mesmo registro, incluindo duplo envio                          | Segunda publicação 409; mesmos prazos, sem publicação/eventos duplicados                                                               | P0: integridade do ciclo                 |
| CT-009 | 08    | NEG,PER | Depois de publicar, procurar edição na UI e tentar a requisição de edição se houver | Não permitir alteração; dados originais continuam persistidos. Rota de edição não documentada: inspecionar rede, sem inventar endpoint | P1: mudança de condições após publicação |
| CT-010 | 09    | PER     | Fornecedor tenta criar e publicar por UI e API                                      | UI não oferece ação autorizada; API retorna 403; compra não muda                                                                       | P0: acesso indevido                      |
| CT-011 | 09    | PER     | Fornecedor consulta ID de rascunho do comprador e busca/lista registros             | Detalhe retorna 404; rascunho não aparece nem vaza dados nas consultas                                                                 | P0: exposição de rascunho                |
| CT-012 | 06    | PER     | Órgão diferente tenta publicar rascunho alheio                                      | Acesso negado, sem transição. **Bloqueado por massa:** ambiente só oferece um órgão; solicitar fixture/usuário adicional               | P0: isolamento por proprietário          |

## HU02 — Lances

| ID     | CA    | Tipo    | Preparação / ação / dados                                                        | Resultado esperado                                                                                                    | Prioridade e risco                         |
| ------ | ----- | ------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| CT-013 | 01    | POS,FR  | Compra ABERTA sem lance, teto 450; primeiro lance 450                            | Aceito 201, histórico contém lance e valor; menor lance 450                                                           | P0: participação válida                    |
| CT-014 | 01,06 | NEG,FR  | Compra sem lances; enviar -1, 0 e 450.01                                         | Rejeição 422; nenhum lance gravado                                                                                    | P0: preços inválidos                       |
| CT-015 | 02,06 | FR,NEG  | Menor 450; testar 450, 449.01, 449 e 448.99 em compras independentes             | 450 e 449.01 recusados; 449 e 448.99 aceitos; redução mínima de 1 respeitada                                          | P0: classificação incorreta                |
| CT-016 | 02,07 | POS,PER | A oferece 450; B oferece 449; A oferece 448                                      | Três aceitos; regra considera menor global, independentemente do autor                                                | P0: favorecimento de fornecedor            |
| CT-017 | 03    | NEG,EST | Enviar lance em AGENDADA, ENCERRADA, DESERTA e HOMOLOGADA                        | 409 em cada estado; contagem/histórico permanecem iguais                                                              | P0: lance fora da disputa                  |
| CT-018 | 04    | PER     | Comprador tenta lance em disputa ABERTA por API e UI                             | API 403; UI não permite ação; nenhum lance gravado                                                                    | P0: separação de papéis                    |
| CT-019 | 05,09 | POS     | Aceitar dois lances; atualizar ambas as sessões e consultar API                  | Persistem valores, fornecedor e horário; histórico do mais recente para o mais antigo; menor correto                  | P1: rastreabilidade                        |
| CT-020 | 08    | CON     | Dois fornecedores enviam simultaneamente 450 em disputa vazia                    | Exatamente um 201 e outro 422; um único registro de 450; nenhum 500                                                   | P0: condição de corrida                    |
| CT-021 | 08    | CON     | A envia 450 e B 449 simultaneamente                                              | B aceito; A pode ser aceito antes de B ou rejeitado depois dele; menor final 449. Não impor ordem de rede inexistente | P0: consistência com ordenação concorrente |
| CT-022 | 06    | NEG     | Após lance inválido, comparar lista, menor lance e auditoria com estado anterior | Nenhum lance inválido persistido nem alteração indevida da classificação                                              | P0: corrupção após erro                    |

## HU03 — Prazos, estados e consultas

| ID     | CA    | Tipo    | Preparação / ação / dados                                                                                             | Resultado esperado                                                                                                        | Prioridade e risco               |
| ------ | ----- | ------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| CT-023 | 01    | POS,EST | Publicar e observar antes/depois de opensAt via polling da API e UI                                                   | AGENDADA antes; ABERTA a partir da abertura sem ação administrativa                                                       | P0: abertura automática          |
| CT-024 | 02,06 | FR,EST  | Enviar lances ao redor da abertura e fechamento; registrar horário efetivo de processamento no servidor               | Aceitação somente no intervalo [opensAt, closesAt); exatamente closesAt já deve recusar                                   | P0: vantagem fora do prazo       |
| CT-025 | 03    | POS,EST | Deixar terminar compra com lance válido                                                                               | ENCERRADA; menor lance preservado                                                                                         | P0: finalização válida           |
| CT-026 | 03    | POS,EST | Deixar terminar compra sem lances                                                                                     | DESERTA; sem vencedor                                                                                                     | P0: resultado sem concorrentes   |
| CT-027 | 04,05 | POS,EST | Manter listagem e detalhe abertos durante transição; depois refresh                                                   | UI converge ao estado efetivo da API sem refresh obrigatório; após refresh continua correta                               | P1: estado desatualizado         |
| CT-028 | 06    | NEG,EST | Alterar relógio do navegador em contexto controlado, sem mudar servidor; tentar lance com disputa fechada             | Cronômetro não concede autorização; backend recusa                                                                        | P0: confiar no cliente           |
| CT-029 | 07    | POS     | Filtrar cada status com massa conhecida; percorrer páginas                                                            | Todos os itens correspondem ao filtro; consultar detalhe para conferir estado efetivo                                     | P2: consulta incorreta           |
| CT-030 | 08    | NEG,EST | Fazer vários refreshes antes e depois das transições; comparar auditoria e prazos                                     | Datas inalteradas; nenhum evento de abertura/encerramento duplicado                                                       | P1: efeito colateral de consulta |
| CT-031 | 04,07 | POS,FR  | Buscar código conhecido e termo inexistente; paginação e size=100,101; page negativo e parâmetro desconhecido via API | Busca coerente; vazio sem erro; size 100 aceito, 101/page negativo/parâmetro desconhecido recusados conforme README (400) | P2: contrato e navegação         |

**Limite de CT-024:** o horário de envio no cliente não prova o instante em que o backend processou a requisição. Sem logs precisos ou relógio injetável, testar imediatamente antes/depois e registrar a fronteira exata como não comprovada. Não chamar uma diferença de latência de bug temporal sem evidência do servidor.

## HU04 — Homologação, resultado e relatório

| ID     | CA       | Tipo    | Preparação / ação / dados                                             | Resultado esperado                                                                                                       | Prioridade e risco              |
| ------ | -------- | ------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| CT-032 | 01,02,03 | POS,EST | Encerrar compra com A=450 e B=449; comprador homologa                 | HOMOLOGADA; B vencedor por 449; ID vencedor corresponde ao menor lance                                                   | P0: vencedor incorreto          |
| CT-033 | 01,08    | PER     | Fornecedor tenta homologar por UI e API                               | Sem ação permitida na UI; API 403; estado não muda                                                                       | P0: decisão não autorizada      |
| CT-034 | 02       | NEG,EST | Homologar em RASCUNHO, AGENDADA e ABERTA                              | 409; sem vencedor ou data de homologação adicionada                                                                      | P0: resultado antecipado        |
| CT-035 | 06       | NEG,EST | Tentar homologar DESERTA                                              | Rejeição, sem homologação. 409 ou 422 conforme precedência da validação; esclarecer contrato antes de exigir um dos dois | P0: homologar sem lance         |
| CT-036 | 04       | POS,NEG | Abrir modal e cancelar; depois abrir e confirmar                      | Cancelar não envia homologação nem altera estado; confirmar persiste homologatedAt e vencedorLanceId                     | P1: confirmação acidental       |
| CT-037 | 05       | NEG,EST | Após homologação, homologar de novo e enviar lance                    | Ambas ações 409; resultado, data e histórico permanecem consistentes                                                     | P0: resultado mutável           |
| CT-038 | 07       | POS     | Consultar histórico de fluxo completo e comparar com ações executadas | Criação, publicação, lances e homologação com responsável e horário, sem perdas/duplicações                              | P1: auditoria                   |
| CT-039 | 08       | POS,PER | Fornecedores consultam resultado publicado e atualizam página         | Mesmo vencedor/valor da API; consulta não exige perfil de comprador                                                      | P1: transparência               |
| CT-040 | 09       | POS     | Baixar PDF de compra homologada; abrir arquivo e comparar tela/API    | PDF válido e legível; identificação, quantidade, valores e vencedor coerentes com os campos efetivamente presentes       | P1: documento divergente        |
| CT-041 | 01       | PER     | Órgão distinto tenta homologar compra alheia                          | Rejeição sem alteração. **Bloqueado:** segundo órgão não disponível                                                      | P0: decisão sobre compra alheia |

### Variações de CT-032 — fluxo E2E-01

As duas massas usam compras independentes e sessões separadas; publicar, aguardar ABERTA, enviar os dois lances, aguardar ENCERRADA, confirmar homologação e consultar o resultado antes/depois do refresh. Prioridade P0: risco de vencedor ou cálculo incorreto.

| Quantidade | Primeiro lance | Segundo lance | Vencedor esperado | Unitário esperado | Total esperado | Execução de 26/10/2026 |
| ---------- | -------------- | ------------- | ----------------- | ----------------- | -------------- | ---------------------- |
| 4          | Alpha: 450,00  | Beta: 449,00  | Beta              | 449,00            | 1.796,00       | Aprovado               |
| 3          | Beta: 120,50   | Alpha: 119,50 | Alpha             | 119,50            | 358,50         | Aprovado               |

Rastreabilidade: HU02 CA01/02/05/07/09 (lances, sessões e histórico na interface), HU03 CA01/02/03 (transições observadas, sem comprovar a fronteira temporal exata) e HU04 CA03/04/05/08 (vencedor, modal, bloqueios e consulta). Evidências: [execução de 26/10](../resultados/automacao-2026-10-26/resumo.md). São variações do CT-032, mantendo os 44 cenários do plano; não representam execução integral dos demais casos relacionados.

## Autenticação e erros transversais

| ID     | Tipo    | Preparação / ação                                            | Resultado esperado                                                                      | Prioridade e risco         |
| ------ | ------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------- |
| CT-042 | POS,NEG | Login válido por perfil e login/senha incorretos             | Válido 200 com token e perfil correto; inválido 401 sem token utilizável                | P0: autenticação           |
| CT-043 | PER,NEG | Sem token, token inválido e token expirado em rota protegida | 401; UI exige nova autenticação, sem executar ação protegida                            | P0: acesso sem sessão      |
| CT-044 | NEG     | ID inexistente e JSON malformado                             | Respectivamente 404 e 400; erro com code/message/timestamp/traceId; X-Trace-Id presente | P1: contrato e diagnóstico |

## Execução e registro

Executar primeiro CT-001 → CT-007 → CT-013 → CT-016 → CT-025 → CT-032 (fluxo crítico), depois permissões, erros/fronteiras e consultas. Cada caso é independente, exceto quando a preparação documentar expressamente o fluxo anterior.

Para registrar cada execução, usar:

```text
ID / variação:
Data / executor:
Ambiente / versão / navegador / configuração:
Pré-condições verificadas:
Dados / código e ID da compra:
Passos executados:
Resultado esperado:
Resultado obtido:
Status: Não executado | Aprovado | Reprovado | Bloqueado
Evidências: captura, resposta HTTP, traceId, logs (sem token/senha)
Bug relacionado:
```

Caso detalhado de referência: CT-001. Preparar login de comprador; abrir `/compras/nova`; preencher massa base; salvar; registrar código/ID; abrir detalhe; conferir RASCUNHO e dados; atualizar a página e conferir persistência; criar outra compra e comparar identidades. Esperado: dados iguais aos informados, códigos e IDs distintos. Registrar o resultado real, sem inferir aprovação pelo clique em salvar.

## Critérios de entrada e saída

Entrada: ambiente healthy, usuários funcionais, requisitos acessíveis, massa identificável. Saída proposta: P0 executados e aprovados; defeitos críticos/altos resolvidos e retestados; P1 executados ou ressalvas aceitas; carga e relatório analisados. Ausência de ambiente é impedimento, não aprovação.

## Rastreabilidade e limitações

| História    | Critérios                       | Casos         |
| ----------- | ------------------------------- | ------------- |
| HU01        | CA01–CA09                       | CT-001–CT-012 |
| HU02        | CA01–CA09                       | CT-013–CT-022 |
| HU03        | CA01–CA08                       | CT-023–CT-031 |
| HU04        | CA01–CA09                       | CT-032–CT-041 |
| Transversal | README: login, erros e contrato | CT-042–CT-044 |

Fora do escopo inicial: auditoria de segurança completa, recuperação de senha/cadastro (não disponíveis), acessibilidade abrangente, múltiplos navegadores e capacidade de produção. Segundo órgão, instante exato de fronteira e contrato detalhado do PDF exigem evidências adicionais; não inventar resultado. A matriz expressa **cobertura planejada**, não executada.
