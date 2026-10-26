# QA Challenge — Compras Diretas

Avaliação do [desafio de QA](enunciado/DESAFIO.md), com plano de testes, automação em Playwright, carga com JMeter e relatos de bugs. O projeto foi desenvolvido com apoio de IA, conforme permitido pelo desafio.

**Recomendação: não liberar.** Há falhas nos valores exibidos, na busca e no tratamento de lances. Os detalhes e as evidências estão no [relatório](docs/04-relatorio.md).

## Resultados — 26/10/2026

- **Automação:** 28 testes, 22 aprovados e 6 reprovados. Os dois fluxos completos passaram.
- **Carga:** 12 rodadas JMeter, 36.030 requisições e zero erros. Maior P95 por rodada: 8,00 ms. A medição é local e não determina a capacidade máxima do sistema.

| Parte                                             | Conteúdo                         |
| ------------------------------------------------- | -------------------------------- |
| [A — Plano de testes](docs/01-plano-de-testes.md) | Cenários, prioridades e riscos   |
| [B — Automação](docs/02-automacao.md)             | Cobertura, execução e falhas     |
| [C — Performance](docs/03-performance.md)         | Configuração, medições e análise |
| [D — Relatório](docs/04-relatorio.md)             | Bugs, limitações e recomendação  |

## Preparar o ambiente

É preciso ter Node.js 22+, Docker com Compose e a [imagem v1.0 da aplicação](https://github.com/Jonathas-Borges/qa-challenge-compras-candidato/releases/tag/v1.0). Para carga, também são necessários Java 17 ou 21, [JMeter 5.6.3](https://jmeter.apache.org/download_jmeter.cgi) e PowerShell: 5.1+ no Windows ou [7 no Linux](https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-linux).

```sh
git clone https://github.com/raphaelmanzolli/qa-challenge-compras.git
cd qa-challenge-compras
```

Baixe `qa-challenge-compras-1.0.tar` da release e coloque na raiz do projeto. Crie o `.env` sem substituir uma configuração existente:

Windows / PowerShell:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Linux / Bash:

```bash
if [ ! -f .env ]; then cp .env.example .env; fi
```

Depois, em qualquer sistema:

```sh
docker load -i qa-challenge-compras-1.0.tar
docker compose up -d --wait
npm ci
```

No Windows, instale o navegador com `npx playwright install chromium`. No Linux, use `npx playwright install --with-deps chromium`; a instalação das bibliotecas pode pedir sudo. Se o PowerShell bloquear `npm` ou `npx`, use `npm.cmd` e `npx.cmd`.

No WSL2 com Docker Desktop, habilite a distribuição em **Settings → Resources → WSL Integration**.

```sh
npm run preflight
```

Aplicação: [localhost:8080](http://localhost:8080). Usuários demo: `comprador`, `fornecedor.a` e `fornecedor.b`. Senha: `DesafioQA@2026`.

## Rodar os testes

```sh
npm test
npm run report
```

A suíte cria suas próprias compras e usa os prazos padrão: abertura em 10 s e disputa de 45 s. Retorna código 1 quando os testes reproduzem os defeitos documentados.

| Comando               | Escopo                                           |
| --------------------- | ------------------------------------------------ |
| `npm run test:flow`   | Dois fluxos completos, com inteiros e centavos   |
| `npm run test:api`    | Cadastro, permissões, lances, estados e busca    |
| `npm run test:e2e`    | Testes de interface                              |
| `npm run test:bugs`   | Regressões dos bugs; PDF é conferido manualmente |
| `npm run test:headed` | Navegador visível; requer ambiente gráfico       |

## Rodar a carga

Extraia o JMeter fora do repositório, conferindo o SHA-512 da distribuição. Configure o caminho da instalação:

Windows / PowerShell:

```powershell
$env:JMETER_HOME = 'C:\ferramentas\apache-jmeter-5.6.3'
```

Linux / Bash:

```bash
export JMETER_HOME="$HOME/ferramentas/apache-jmeter-5.6.3"
pwsh --version
```

```sh
java -version
npm run perf:campaign
```

A campanha executa leitura e lances, com 1 e 10 usuários e três repetições. Ela prepara os dados, aumenta temporariamente a disputa para 600 s e restaura a configuração ao terminar. Execute separadamente do Playwright para não interferir nas medições.

Para uma rodada de leitura: `npm run perf:read -- -Users 10 -Duration 60`. Os planos, parâmetros e instruções para abrir o dashboard estão na [Parte C](docs/03-performance.md).

Para parar a aplicação, preservando o banco:

```sh
docker compose down
```

Adicionar `-v` remove o banco e as compras usadas nas evidências.

## Verificações e evidências

```sh
npm run check
npm run format:check
npm run test:tools
```

`npm run test:jmeter` verifica o runner com API simulada e requer Java, JMeter e PowerShell. Não entra na medição do produto.

O [CI](.github/workflows/ci.yml) verifica o código e roda API/E2E em Ubuntu, preservando relatórios por sete dias. As falhas do produto continuam reprovando os testes. A carga é executada localmente.

A skill [qa-test-design](.agents/skills/qa-test-design/SKILL.md) reúne orientações para planejar testes e registrar bugs; seu uso é opcional.

Os [resultados e anexos](resultados/README.md) sustentam as conclusões. O relatório HTML, vídeos e traces ficam locais; revise traces antes de compartilhar, pois podem conter autenticação demo. Imagem Docker, `.env` e dependências não são versionados.
