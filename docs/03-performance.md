# Parte C — Performance

Usei Apache JMeter 5.6.3 para medir consultas e envio de lances. A instalação e os comandos estão no [README](../README.md#rodar-a-carga).

## Cenários e configuração

| Plano                                     | Operações                                           | Dados                                                                                      |
| ----------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [leitura.jmx](../performance/leitura.jmx) | Duas listagens, um detalhe e um histórico por ciclo | Uma compra própria compartilhada para consulta                                             |
| [lances.jmx](../performance/lances.jmx)   | Envio de lances, alternando Alpha e Beta            | Uma compra por usuário, quantidade 1, teto de R$ 1.000.000 e redução de R$ 1 por tentativa |

| Usuários | Aquecimento | Medição | Repetições por cenário |
| -------- | ----------- | ------- | ---------------------- |
| 1        | 5 s         | 15 s    | 3                      |
| 10       | 5 s         | 60 s    | 3                      |

São 12 rodadas, com pausa de 100 ms e timeout de 5 s. Cada usuário aguarda a resposta antes de continuar; se a aplicação desacelera, a taxa de requisições também cai. Os planos usam componentes nativos e Groovy, sem plugins externos.

O setup autentica e cria os dados. Login, preparação, aquecimento e conferência de persistência ficam fora da medição. Só as requisições do grupo de medição entram no JTL. Na escrita, a campanha aumenta a disputa para 600 s e restaura o valor original ao terminar, sem apagar o banco.

Defini como limites experimentais **P95 ≤ 1.000 ms e erros ≤ 1%**, além de preparação concluída, aquecimento sem erros e persistência válida. O desafio não fornece SLA. Erros HTTP, timeout e falhas de contrato contam como erro; uma falha de preparação não aprova nem mede o produto.

## Resultados

**26/10/2026: 36.030 requisições medidas, zero erros e maior P95 por rodada de 8,00 ms.** As 12 rodadas atenderam aos limites definidos.

Ambiente: Ubuntu 24.04.3 LTS, Docker Engine 29.7.2, Java 21.0.12.1, JMeter 5.6.3 e PowerShell 7.6.9. Docker com 20 CPUs e 31,05 GiB disponíveis; aplicação e gerador no mesmo computador. Não houve amostragem de CPU/memória. A campanha terminou às 16:45:30 -03:00 e restaurou a disputa para 45 s.

Média, P90, P95 e vazão foram calculados pelo dashboard nativo do JMeter. Os valores abaixo estão arredondados para apresentação.

| Rodada                                                                               | Requisições | Média ms | P90 ms | P95 ms | Req/s | Erros |
| ------------------------------------------------------------------------------------ | ----------- | -------- | ------ | ------ | ----- | ----- |
| [read-1vu-rodada1](../resultados/jmeter-2026-10-26/read-1vu-rodada1/execucao.json)   | 145         | 2,17     | 3,00   | 3,00   | 9,77  | 0     |
| [read-1vu-rodada2](../resultados/jmeter-2026-10-26/read-1vu-rodada2/execucao.json)   | 145         | 2,37     | 3,00   | 4,00   | 9,74  | 0     |
| [read-1vu-rodada3](../resultados/jmeter-2026-10-26/read-1vu-rodada3/execucao.json)   | 145         | 2,16     | 3,00   | 3,00   | 9,76  | 0     |
| [read-10vu-rodada1](../resultados/jmeter-2026-10-26/read-10vu-rodada1/execucao.json) | 5870        | 1,75     | 2,00   | 3,00   | 98,11 | 0     |
| [read-10vu-rodada2](../resultados/jmeter-2026-10-26/read-10vu-rodada2/execucao.json) | 5880        | 1,58     | 2,00   | 3,00   | 98,29 | 0     |
| [read-10vu-rodada3](../resultados/jmeter-2026-10-26/read-10vu-rodada3/execucao.json) | 5880        | 1,55     | 2,00   | 2,00   | 98,32 | 0     |
| [bids-1vu-rodada1](../resultados/jmeter-2026-10-26/bids-1vu-rodada1/execucao.json)   | 140         | 5,81     | 8,00   | 8,00   | 9,42  | 0     |
| [bids-1vu-rodada2](../resultados/jmeter-2026-10-26/bids-1vu-rodada2/execucao.json)   | 142         | 4,16     | 6,00   | 6,00   | 9,57  | 0     |
| [bids-1vu-rodada3](../resultados/jmeter-2026-10-26/bids-1vu-rodada3/execucao.json)   | 143         | 3,61     | 5,00   | 5,00   | 9,62  | 0     |
| [bids-10vu-rodada1](../resultados/jmeter-2026-10-26/bids-10vu-rodada1/execucao.json) | 5820        | 2,64     | 3,00   | 4,00   | 97,29 | 0     |
| [bids-10vu-rodada2](../resultados/jmeter-2026-10-26/bids-10vu-rodada2/execucao.json) | 5860        | 2,06     | 3,00   | 3,00   | 97,84 | 0     |
| [bids-10vu-rodada3](../resultados/jmeter-2026-10-26/bids-10vu-rodada3/execucao.json) | 5860        | 2,05     | 3,00   | 3,00   | 97,85 | 0     |

[Manifesto da campanha](../resultados/jmeter-2026-10-26/campanha.json) · [Resumo das rodadas](../resultados/jmeter-2026-10-26/resumo.md). Não foi calculada média de percentis entre rodadas.

## Análise

A carga ficou dentro dos limites propostos, mas não determina capacidade máxima. O gerador compartilha recursos com a aplicação, e a ordem dos perfis e o aquecimento podem influenciar os números. Uma latência menor com 10 usuários não comprova ganho de desempenho.

A conferência de persistência comparou cada lance aceito com o histórico: ID, fornecedor, valor, horário e sequência. Também verificou a ordem temporal e a redução mínima de R$ 1,00 entre lances. Os arquivos `consistencia.json` registram o resultado por compra, incluindo o aquecimento.

Cada usuário de carga tem sua própria compra. Portanto, a campanha não avalia vários usuários disputando a mesma compra e não elimina BUG-003. Os resultados funcionais continuam impedindo a liberação.

## Executar e consultar evidências

`npm run perf:campaign` prepara e restaura o ambiente. Para uma leitura avulsa, use `npm run perf:read -- -Users 10 -Duration 60`. Escrita avulsa exige configurar e restaurar a duração da disputa; prefira a campanha completa.

Os scripts aceitam usuários, duração, aquecimento, pausa, timeout, limites e pasta de saída. Use uma pasta nova. O destino deve ser HTTP local; não execute Playwright durante a carga.

Cada rodada preserva `resultados.jtl`, `execucao.json`, `preparacao.json`, `consistencia.json` e `statistics.json`. O dashboard HTML e os logs ficam locais. Para reconstruir o dashboard, na raiz do projeto:

Windows / PowerShell:

```powershell
& "$env:JMETER_HOME\bin\jmeter.bat" -g resultados/jmeter-2026-10-26/read-10vu-rodada1/resultados.jtl -o resultados/dashboard-leitura -q performance/jmeter.properties
```

Linux / Bash:

```bash
"$JMETER_HOME/bin/jmeter" -g resultados/jmeter-2026-10-26/read-10vu-rodada1/resultados.jtl -o resultados/dashboard-leitura -q performance/jmeter.properties
```

Para abrir um plano na GUI, use o mesmo executável com `-t performance/leitura.jmx` ou `-t performance/lances.jmx`. A medição usa modo não gráfico. [Estatísticas do dashboard](https://jmeter.apache.org/usermanual/generating-dashboard.html).
