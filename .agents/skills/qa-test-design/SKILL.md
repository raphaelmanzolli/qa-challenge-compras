---
name: qa-test-design
description: 'Criar ou revisar casos de teste e relatórios de bugs a partir de requisitos e evidências. Usar para planejamento de QA e documentação de defeitos; não substitui execução de testes.'
---

# Casos de teste e relatórios de bugs

Produzir documentação curta, rastreável e executável por outra pessoa. Seguir o formato já adotado no projeto; usar Markdown quando nenhum formato for solicitado.

## Escolher a saída

- Pedido de cenários ou plano: transformar regras em verificações e usar o modelo de caso de teste.
- Pedido de bug: confrontar o comportamento observado com a regra e usar o modelo de defeito.
- Pedido dos dois: relacionar cada defeito ao caso e critério correspondentes.

Os modelos estão em [references/modelos.md](references/modelos.md). Ler somente o modelo necessário ao pedido.

## Casos de teste

1. Ler requisitos, critérios de aceitação e convenções existentes antes de escrever.
2. Identificar regras, perfis, dados e estados relevantes. Separar requisito explícito de hipótese; quando faltar regra essencial, registrar a dúvida sem inventar resultado esperado.
3. Selecionar positivos, negativos, fronteiras, permissões e transições conforme o risco. Não impor quantidade fixa de casos.
4. Dar um objetivo verificável a cada caso. Variações podem ficar em tabela, com resultado esperado explícito por entrada.
5. Referenciar história/critério, explicar o risco e priorizar. Prioridade é ordem de atenção; severidade pertence ao impacto de um defeito observado.
6. Usar “Não executado” para casos apenas escritos. Não converter cobertura planejada em aprovação ou assumir relação de um para um com testes automatizados.

## Relatórios de bugs

1. Usar somente o que as evidências demonstram: ambiente, massa, passos, esperado e obtido.
2. Se ainda não houver reprodução/evidência suficiente, registrar “achado a confirmar” e o que falta; não declarar bug confirmado ou frequência inventada.
3. Distinguir defeito do produto, erro no teste e impedimento de ambiente. Uma expectativa de contrato equivocada exige corrigir o teste com justificativa.
4. Separar impacto comprovado de risco potencial e de hipótese sobre a causa. Status HTTP, persistência e traceId ajudam a sustentar a conclusão.
5. Remover tokens e credenciais reais das evidências. Referenciar arquivos disponíveis, sem criar links fictícios.

A geração de documentação não implica executar carga, alterar a aplicação, publicar issues ou enviar commits. Executar essas ações somente dentro do escopo autorizado pelo usuário.
