# Desafio técnico — QA Pleno: Compras Diretas

## Contexto

Você recebeu um ambiente de homologação fictício de Compra Direta Eletrônica. Há quatro histórias de usuário (veja `HISTORIAS.md`) relacionadas ao fluxo de criação, publicação, disputa, encerramento e homologação. Seu objetivo é avaliar a qualidade do sistema, propor cobertura baseada em risco e comunicar suas conclusões.

O ambiente roda inteiramente no seu computador (Docker). Instruções de instalação, usuários e reset estão no `README.md`.

## Entregáveis

**Parte A — Plano de testes (30%)**
Cenários positivos, negativos, de fronteira, de permissão e de transição de estados, com justificativa de risco e priorização. Pode usar Markdown, planilha ou ferramenta equivalente, desde que legível.

**Parte B — Automação E2E (35%)**
Projeto executável (Playwright recomendado; outra ferramenta é aceita) com instruções de execução, asserções reais de resultado e pelo menos **um fluxo dependente de estados temporais e de perfis distintos**. O teste deve separar preparação dos dados, ação e validação, e não se limitar a verificar que botões foram clicados.

**Parte C — Performance (25%)**
Script/projeto de carga, configuração dos usuários virtuais, duração, dados e resultados (P90/P95, média, throughput e erros), com conclusão crítica. Podem ser usadas as APIs REST.

**Parte D — Relatório (10%)**
Achados com passos de reprodução, resultado esperado, resultado obtido, ambiente, evidência e avaliação de risco; recomendação de liberação ou ressalvas.

## Regras do exercício

- Não é necessário automatizar todas as histórias; justifique a seleção.
- Não use senhas, dados pessoais ou APIs reais.
- Use o ambiente local (Docker) para testes de carga. Não aponte carga para endereços de terceiros.
- É permitido usar IA; espera-se que você saiba explicar decisões e resultados.
- Falha em um teste automatizado pode indicar **bug real**: reporte a causa e as evidências, não force o teste a passar.
- Não use espera fixa como solução padrão para sincronização; se for necessária, justifique.
- Você pode documentar impedimentos reais e propor alternativas, sem inventar conclusões.

## Dicas sobre o ambiente

- A disputa é temporizada pelo **relógio do servidor**. Por padrão, uma compra publicada abre 10 s depois e fica aberta por 45 s. Esses valores podem ser alterados no `.env` (veja `README.md`).
- As compras pré-carregadas expiram com o tempo (elas são relativas ao momento em que o ambiente subiu). Para fluxos completos, crie seus próprios dados.
- Para escrita sob carga, as compras precisam ficar abertas durante toda a execução. As fixtures abertas por 24 h ajudam em testes curtos, mas cada lance reduz o menor valor em pelo menos R$ 1,00 e algumas têm teto baixo — elas se esgotam rápido sob carga. Para carga sustentada, crie suas próprias compras com `valorMaximoUnitario` alto e aumente `DISPUTE_DURATION_SECONDS` (ex.: 600).
- `docker compose down -v && docker compose up -d` restaura o ambiente ao estado inicial a qualquer momento.

## Forma de entrega

Repositório (ou arquivo compactado) contendo as quatro partes e um `README` explicando como executar sua automação e seus testes de carga. Prazo e canal de envio: conforme informado pelo recrutador.
