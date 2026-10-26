# QA Challenge — Compras Diretas (pacote do candidato)

Simulador **fictício** de Compra Direta Eletrônica com disputa de lances entre fornecedores. Sem compras reais, dados pessoais ou pagamentos.

Conteúdo do pacote:

| Arquivo | Para quê |
|---|---|
| `qa-challenge-compras-*.tar` | Imagem Docker da aplicação (frontend + API) — baixada da Release (veja abaixo) |
| `compose.yaml` | Sobe a aplicação e um PostgreSQL local |
| `.env.example` | Variáveis opcionais (porta, tempos da disputa, senha demo) |
| `HISTORIAS.md` | Histórias de usuário e critérios de aceitação |
| `DESAFIO.md` | O que entregar e regras do exercício |

## Requisitos

- Docker 24+ com Docker Compose v2 (`docker compose version`)
- ~1,5 GB livres; porta `8080` livre (ou altere `APP_PORT`)

## Baixar a imagem (`.tar`)

A imagem Docker é grande e fica anexada na **Release `v1.0`** do repositório, não no código. Baixe o `.tar` por um dos caminhos:

- **Navegador:** abra a página de *Releases* do repositório, entre na **v1.0** e baixe `qa-challenge-compras-1.0.tar` (e o `SHA256SUMS`).
- **GitHub CLI (`gh`):**

  ```bash
  gh release download v1.0 -R Jonathas-Borges/qa-challenge-compras-candidato \
    -p 'qa-challenge-compras-1.0.tar' -p 'SHA256SUMS'
  ```

- **curl:**

  ```bash
  curl -L -o qa-challenge-compras-1.0.tar \
    https://github.com/Jonathas-Borges/qa-challenge-compras-candidato/releases/download/v1.0/qa-challenge-compras-1.0.tar
  ```

Confira a integridade (opcional, recomendado) com o `SHA256SUMS` que acompanha o pacote:

```bash
sha256sum -c SHA256SUMS      # deve imprimir: qa-challenge-compras-1.0.tar: OK
```

Coloque o `.tar` na mesma pasta do `compose.yaml` antes de continuar.

## Subir o ambiente

```bash
docker load -i qa-challenge-compras-1.0.tar     # uma única vez
docker compose up -d
docker compose ps                               # aguarde app e db como "healthy" (~20-40 s)
```

Acesse **http://localhost:8080**.

Comandos úteis:

```bash
docker compose logs -f app      # logs da aplicação
docker compose down             # para (mantém os dados)
docker compose down -v          # para e APAGA os dados
```

## Usuários de demonstração

| Login | Papel | Nome exibido |
|---|---|---|
| `comprador` | ORGAO | Unidade Compradora Demo |
| `fornecedor.a` | FORNECEDOR | Fornecedor Alpha |
| `fornecedor.b` | FORNECEDOR | Fornecedor Beta |

Senha (local): `DesafioQA@2026` — configurável por `DEMO_PASSWORD` no `.env`.

O token fica no `sessionStorage`: cada aba/contexto de navegador tem sua própria sessão. Para simular dois fornecedores ao mesmo tempo, use contextos/janelas anônimas separadas.

## Reset (voltar ao estado inicial)

```bash
docker compose down -v
docker compose up -d
```

O banco é recriado com usuários e ~300 compras de exemplo. Códigos, quantidades e valores são sempre os mesmos; **horários são relativos ao momento da subida** e os **IDs (UUID) mudam a cada reset** — localize recursos por código (`CD-000001`…) ou pela resposta de criação.

Compras de referência pré-carregadas:

| Código | Situação ao subir |
|---|---|
| `CD-000001` | AGENDADA (abre 24 h após a subida) |
| `CD-000002` | ABERTA até 24 h após a subida, com 1 lance |
| `CD-000003` | ENCERRADA com 2 lances, aguardando homologação |
| `CD-000004` | DESERTA |
| `CD-000005` | HOMOLOGADA |

## Configuração (`.env`)

```bash
cp .env.example .env    # edite e rode: docker compose up -d
```

| Variável | Padrão | Efeito |
|---|---|---|
| `APP_PORT` | `8080` | Porta no host |
| `DISPUTE_OPEN_DELAY_SECONDS` | `10` | Segundos entre publicar e abrir a disputa |
| `DISPUTE_DURATION_SECONDS` | `45` | Duração da disputa aberta |
| `FRONTEND_POLL_INTERVAL_MS` | `2000` | Intervalo de atualização das telas de disputa |
| `DEMO_PASSWORD` | `DesafioQA@2026` | Senha dos usuários demo (vale após reset) |
| `JWT_TTL_MINUTES` | `120` | Validade do token |

As datas de abertura/encerramento são gravadas **na publicação**; mudar as variáveis não altera disputas já publicadas.

## Telas

| Rota | Tela |
|---|---|
| `/login` | Login |
| `/compras` | Listagem com filtro por status, busca e paginação |
| `/compras/nova` | Cadastro (ORGAO) |
| `/compras/:id` | Detalhe, publicação e homologação |
| `/compras/:id/disputa` | Painel da disputa, envio de lance e histórico de lances |
| `/compras/:id/resultado` | Resultado e histórico da compra |

O campo de lance é o componente `<bid-input>` (Web Component com Shadow DOM aberto).

## API REST

Prefixo `/api`, JSON `camelCase`, datas ISO‑8601 em UTC, autenticação `Authorization: Bearer <token>`.

| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| `POST` | `/api/auth/login` | público | 200 — `{ token, tokenType, expiresAt, usuario }` |
| `GET` | `/api/auth/me` | autenticado | 200 — perfil |
| `GET` | `/api/compras?status=&q=&page=0&size=20` | autenticado | 200 — página (`size` máx. 100, `page` base zero) |
| `POST` | `/api/compras` | ORGAO | 201 — compra em RASCUNHO |
| `GET` | `/api/compras/{id}` | autenticado (rascunho só o órgão dono) | 200 — detalhe + `serverNow` |
| `POST` | `/api/compras/{id}/publicar` | ORGAO dono | 200 — com `opensAt` / `closesAt` |
| `GET` | `/api/compras/{id}/lances` | autenticado | 200 — lances, do mais recente para o mais antigo |
| `POST` | `/api/compras/{id}/lances` | FORNECEDOR | 201 — lance |
| `POST` | `/api/compras/{id}/homologar` | ORGAO dono | 200 — compra com `vencedor` |
| `GET` | `/api/compras/{id}/historico` | autenticado | 200 — eventos de auditoria |
| `GET` | `/actuator/health` | público | 200 quando pronta |

Status possíveis: `RASCUNHO`, `AGENDADA`, `ABERTA`, `ENCERRADA`, `DESERTA`, `HOMOLOGADA`.

Exemplos:

```bash
BASE=http://localhost:8080
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"login":"comprador","senha":"DesafioQA@2026"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s -X POST $BASE/api/compras -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"objeto":"Aquisição de cadeiras para escritório","descricao":"Setor administrativo","quantidade":4,"valorMaximoUnitario":450.00}'

curl -s "$BASE/api/compras?status=ABERTA&page=0&size=20" -H "Authorization: Bearer $TOKEN"
```

Lance (como fornecedor): `POST /api/compras/{id}/lances` com `{ "valorUnitario": 429.00 }`.

### Padrão de respostas de erro

| Código | Uso |
|---|---|
| `400` | JSON malformado, tipo inválido, parâmetro de consulta desconhecido ou inválido |
| `401` | Sem token, token inválido ou expirado; credenciais inválidas |
| `403` | Papel sem permissão para a ação |
| `404` | Recurso inexistente (rascunho de outro perfil é tratado como inexistente) |
| `409` | Transição de estado conflitante (ex.: publicar duas vezes, lance fora da disputa aberta, homologar antes do encerramento ou de novo) |
| `422` | Violação de regra de domínio (ex.: valor de lance insuficiente, campos fora dos limites, homologar disputa sem lances) |
| `500` | Falha inesperada do servidor |

```json
{
  "code": "LANCE_INSUFICIENTE",
  "message": "O lance deve ser ao menos R$ 1,00 menor que o menor lance vigente (R$ 430.00).",
  "timestamp": "2026-10-23T12:00:22.123Z",
  "traceId": "9fef8d3dcbed4774"
}
```

Erros de validação de formulário trazem também `campos: [{ campo, mensagem }]`. Toda resposta tem o cabeçalho `X-Trace-Id`.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `port is already allocated` | Defina `APP_PORT=8090` no `.env` e suba de novo |
| `app` não fica healthy | `docker compose logs app`; confira se o `db` está healthy; aguarde até 60 s na primeira subida |
| `pull access denied` para a imagem | Rode `docker load -i qa-challenge-compras-1.0.tar` antes do `compose up` |
| Login de repente retorna 401 | Token expirou (120 min) ou o ambiente foi resetado; faça login novamente |
| Compras de referência “mudaram de status” | Esperado: os horários são relativos à subida. Faça reset ou crie compras novas |

## Limitações conhecidas do ambiente

- Ambiente didático local, sem HTTPS, sem recuperação de senha e sem cadastro de usuários.
- Um único órgão e dois fornecedores.
- Não exponha este ambiente na internet.
