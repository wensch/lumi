---
name: pente-fino
description: Revisão completa de um projeto de software (qualquer stack). Use SEMPRE que o usuário pedir "pente fino", "faz um pente fino", "revisão geral", "revisa o projeto inteiro" ou "teste tudo". Lê o código todo, acha e já corrige bugs, falhas de segurança e problemas de desempenho, testa o que for possível, e no fim propõe melhorias priorizadas.
---

# Pente fino

Revisão de ponta a ponta de um projeto. O objetivo é **achar e já corrigir** o que estiver errado,
**provar** que funciona e, no fim, **propor** melhorias (sem implementar sozinho o que é decisão de
produto).

Responda ao usuário no idioma dele, de forma curta e legível (muitas vezes ele lê no celular): listas
curtas, sem tabelas largas, sem despejar logs.

## Regras

- Corrija o que for bug, falha de segurança ou problema de desempenho **comprovado** (você leu o código
  e consegue descrever o cenário em que falha). Mudança de produto, de visual ou de escopo vira
  **proposta**, não código.
- Cada correção: mínima, no estilo do código ao redor, sem refatorar o que não precisa.
- Nunca pule, desligue ou apague teste/lint/verificação para "ficar verde". Teste que falha é achado.
- Ações destrutivas ou difíceis de desfazer (apagar dados, rodar migração em produção, force push,
  publicar, enviar mensagens, gastar dinheiro) só com autorização explícita do usuário **nesta
  conversa**. Em dúvida, pergunte.
- Segredos (chaves, tokens, senhas, certificados) nunca vão para o repositório, para o relatório ou
  para o chat. Ao achar um segredo exposto, avise e proponha trocá-lo.
- Se algo não pôde ser testado aqui (aparelho real, rede bloqueada, serviço externo, loja), diga
  claramente o que ficou sem teste. Nunca diga "testado" para o que só foi lido.
- Achados vindos de ferramentas ou de subagentes são hipóteses: **confirme lendo o código** antes de
  corrigir.

## Passo a passo

### 0. Conhecer o projeto
Antes de mexer em qualquer coisa, descubra:
- O que é e como se organiza: `README`, `AGENTS.md`/`CLAUDE.md`, `docs/`, pastas principais.
- Stack e comandos de verificação: `package.json` (scripts), `pyproject.toml`/`requirements*`,
  `Cargo.toml`, `go.mod`, `pom.xml`/`build.gradle`, `Makefile`, `composer.json`, etc. Veja também o CI
  (`.github/workflows`, `.gitlab-ci.yml`...): o que o CI roda é o que precisa ficar verde.
- Regras do próprio projeto (convenções, "nunca faça X", como gerar arquivos, fluxo de migração).
  **Siga-as** acima destas instruções genéricas. Se existir `docs/pente-fino.md` ou uma seção "Pente
  fino" no `AGENTS.md`/`CLAUDE.md`, leia: é o complemento específico deste projeto.
- Estado do git: branch atual, mudanças não commitadas (não misture o trabalho de outra pessoa).

Em frameworks que mudam rápido (Expo, Next.js, Django, etc.), confira a documentação **da versão
instalada** em vez de confiar na memória.

### 1. Base verde
Rode o que o projeto e o CI usam: formatação, lint, tipos, testes, build. Exemplos:
`npm run lint && npm run typecheck && npm test`, `pytest`, `cargo clippy && cargo test`,
`go vet ./... && go test ./...`. Anote o que já falhava **antes** de você mexer (não é culpa sua, mas é
achado). Corrija o que falha antes de seguir. Rode também a verificação de dependências do ecossistema
(`npm audit`, `pip-audit`, `cargo audit`...) e **avalie** o que de fato afeta o projeto (dependência só
de desenvolvimento costuma ser baixo risco).

### 2. Mapa do código
Liste as pastas e identifique as áreas (ex.: telas/rotas, lógica de negócio, dados/banco, integrações,
funções de servidor, CI/infra, documentação). Para revisão ampla, divida por área e, se tiver subagentes,
use um por área **em paralelo**, só leitura, pedindo: achados com `arquivo:linha`, severidade,
cenário concreto de falha e correção proposta. Depois **você verifica cada achado** antes de corrigir.

### 3. O que procurar
Leia o código de verdade (não só busque palavras).

**Bugs e fluxo**
- Rotas/navegação/fluxos de ponta a ponta: login, cadastro, pagamento, o caminho principal do produto.
- Estados de erro, vazio, carregando, sem rede; toque/clique duplo; condições de corrida; resposta
  atrasada que chega depois de a tela/entidade mudar.
- Datas, fusos, moedas, arredondamento, encoding, números grandes, listas vazias, valores nulos.
- Recursos não liberados (timers, listeners, conexões), efeitos que repetem trabalho, laços infinitos.
- Tipos burlados (`any`, casts forçados, `!`), erros engolidos por `catch` vazio, valores padrão que
  mascaram falha ("0 itens" quando na verdade deu erro de rede).
- Regras de negócio inconsistentes entre si.

**Segurança**
- Autenticação e autorização em **todo** ponto de entrada: o usuário A consegue ler/alterar dado do B
  (IDOR)? Dá para pular uma etapa do fluxo?
- Entradas não confiáveis (formulários, parâmetros, headers, links/deep links, arquivos, webhooks):
  validação, tamanho, tipo; injeção (SQL, comando, template), XSS, SSRF, path traversal, redirect aberto.
- Segredos no código, no histórico do git (`git log -p -S"..."`), em logs, no front-end, em imagens/CI.
- Permissões demais (banco, funções de servidor, tokens, CI com permissões amplas, CORS aberto).
- Dados pessoais: o que é coletado, registrado em log ou enviado a terceiros; exclusão/exportação.
- Se houver banco: controle de acesso por linha, funções privilegiadas com escopo seguro, migrações
  que não dão acesso indevido; rode as ferramentas de análise do próprio serviço (ex.: advisors).
- Dependências com vulnerabilidade conhecida que o projeto realmente usa.

**Desempenho**
- Consultas N+1, sem índice, sem limite/paginação; trabalho repetido que poderia ser uma chamada só.
- Renderização/recálculo desnecessário, listas longas sem virtualização, imagens/arquivos grandes,
  tamanho do pacote/build, carregamento inicial.
- Operações pesadas na thread principal; falta de cache onde é seguro; vazamento de memória.

**Qualidade e manutenção**
- Código morto, duplicação clara, nomes confusos, comentários que mentem, TODOs esquecidos.
- Testes: o que o caminho crítico tem de cobertura? Falta teste para algo que você corrigiu?
- Documentação desatualizada em relação ao código (README, comandos, variáveis de ambiente).
- Se for interface: textos fora da tradução, acessibilidade (rótulos, contraste, alvos de toque,
  leitor de tela, fonte grande), consistência visual.

### 4. Testar o que for possível
- Rode a suíte existente e **adicione testes** para cada bug que corrigir (o teste deve falhar sem a
  correção e passar com ela).
- Rode o projeto de verdade quando der (servidor local, CLI, script, navegador headless) e percorra o
  fluxo principal. Registre erros de console/log.
- Para banco ou serviços, use um ambiente descartável (container, banco local, sandbox) e **nunca**
  dados de produção. Teste o caso feliz, o caso sem permissão, o recurso de outra pessoa, repetição e
  limites.
- Lógica pura: um script rápido com casos de borda.
- Liste separadamente o que dependeu de ambiente que você não tem (dispositivo, rede, serviço, loja).

### 5. Corrigir
Para cada achado confirmado: corrija, rode o teste relacionado e **de novo** a base verde (formatação,
lint, tipos, testes). Releia o próprio diff como um revisor adversarial: o que faria o CI recusar? O que
mais mudou sem querer? Não amplie o escopo.

### 6. Entregar
1. Atualize a documentação afetada.
2. Faça commits claros, agrupados por tema (Segurança, Fluxo, Desempenho, Testes...), seguindo o padrão
   de mensagem do projeto. Suba na branch indicada pelo ambiente/usuário; **só abra PR se pedirem**.
3. Relatório final, curto:
   - **Corrigi** — lista de 1 linha cada, com o impacto para quem usa o produto.
   - **Testei** — o que foi coberto e como.
   - **Não deu para testar aqui** — e o que o usuário precisa verificar por conta própria.
   - **Proponho** — melhorias priorizadas (esforço × ganho). Para as que mudam produto, escopo ou custo,
     **pergunte antes** de fazer; ofereça uma recomendação.
   - **Passos que só o usuário pode fazer** (painéis, chaves, contas, publicação), se houver.
