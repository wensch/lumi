---
name: seguranca-lumi
description: Checklist de segurança e privacidade do Lumi (app Expo + Supabase + edge functions + CI) — segredos, validação de entrada, login e deep links, RLS/funções, privacidade de reflexões e orações, limites contra abuso, dependências e pré-publicação nas lojas. Use ao mexer em login, banco, funções, edge functions, links, notificações, CI, ao revisar segurança ou antes de publicar.
---

# Segurança e privacidade no Lumi

Adaptada de `security-review` do ECC (MIT, ver `../NOTICE-ECC.md`), sem as partes web/blockchain
(XSS, CSRF, Solana, cookies). Responda em **português do Brasil**, curto. Reflexões e pedidos de oração são
dados **íntimos**: privacidade vale mais que conveniência (briefing §15).

## 1. Segredos

- No app só vai a chave **pública** (`EXPO_PUBLIC_*`: URL e anon key do Supabase, chave da YouVersion).
  Service role, chave do Gemini, conta de serviço do FCM, keystore: só em **secrets** do Supabase/GitHub.
- Nada de segredo no repositório nem no histórico: `git log -p -S"<trecho>"`, `git grep -nE "(service_role|BEGIN PRIVATE KEY|AIza|sk-)"`,
  `.gitignore` cobre `.env*`, `*.jks`, `*.keystore`, `*service-account*.json`, `*.p8`, `*.pem`.
- `google-services.json` não é segredo, mas a **chave de API do Firebase** deve ser restrita ao pacote
  `com.lumi.app` + SHA-1 no Google Cloud.
- No CI: segredos só em `secrets`, nunca impressos (nem tamanhos de valores sensíveis, se evitável); permissões
  mínimas do workflow; ações fixadas; **só a branch principal publica** o `apk-latest` (pendência antes das lojas).

## 2. Entrada e validação (sempre no servidor)

- O cliente é território hostil: todo RPC/edge function valida **tipo, tamanho, formato e limites**
  (títulos 3–40/60, regex de passagem bíblica, só links `bible.com`/`youversion.com`, 5–366 dias...).
- Texto livre: rejeitar caracteres de controle e invisíveis (U+200B…, U+202E…); limitar tamanho; nunca usar
  como SQL dinâmico. Todo SQL das funções é parametrizado (sem `execute format` com texto do cliente).
- Parâmetros de rota e deep link (`/circulo/[id]`, `lumi://entrar?codigo=`, payload de notificação): validar
  (UUID, `normalizeInviteCode`) antes de navegar ou consultar. Links externos só `https`.
- Edge functions: JWT verificado (`verify_jwt` + `auth.getUser()`), corpo com tamanho máximo, timeout em todo
  `fetch` externo, **falhar fechado** (sem conseguir conferir a cota, a pergunta não segue).

## 3. Login, sessão e links

- Pendências conhecidas (propor ao usuário antes das lojas): login por **PKCE** (`flowType: 'pkce'` +
  `exchangeCodeForSession`) em vez de tokens no fragmento do deep link (hoje um link `lumi://` forjado pode
  logar a pessoa na conta de outra); sessão no **SecureStore** (hoje AsyncStorage em texto puro; `allowBackup`
  já está desligado); apagar conta e dados (exigência das lojas).
- Nada de `setSession` com tokens vindos de qualquer URL sem checar o caminho esperado.

## 4. Banco

Ver a skill `supabase-banco`. Resumo: tabela fechada + RLS, funções `security definer` com `search_path`,
`auth.uid()`, participação, `revoke` de `public`/`anon`; um usuário/círculo nunca vê o do outro; **rode
`get_advisors` (security e performance)** a cada migration e trate cada alerta que não for esperado.

## 5. Privacidade

- Reflexões e pedidos de oração **nunca** em log, analytics/métricas, crash report, push ou nome de arquivo.
  Push dos círculos leva só nome de quem agiu e do círculo, nunca o texto do pedido (tela bloqueada).
- Métricas (Bloco D) contam eventos, não conteúdo. Crash reporting: remover dados da pessoa dos relatórios.
- Pedido removido/sair do círculo leva o conteúdo junto (já implementado); excluir conta apaga tudo em cascata.
- Texto novo de política/termos: revisão de pessoa/jurídico (a skill `i18n-sync` não substitui isso).

## 6. Abuso e limites

- Cota diária da IA (`consume_ai_quota`, 15/dia, falha fechada); limites de criação por dia e totais
  (desafios, planos, sessões abertas 10/dia, tentativas de convite); travas de concorrência (`for update`).
- Todo RPC novo que grava texto livre ou cria linhas precisa de **teto por dia e total**.

## 7. Dependências

- `npm audit --omit=dev`: separe **toolchain de build** (metro, @expo/cli, node-forge via code-signing — não vai
  no APK) do que chega ao **runtime**. Nunca `npm audit fix --force` (propõe downgrade absurdo do Expo).
- Dependência nova: `npx expo install` (versão do SDK), pacote conhecido, sem script `postinstall` suspeito.
- Duplicata conhecida: `expo-localization` dentro do SDK da YouVersion (`expo-doctor`).

## 8. Antes de publicar (Bloco E)

- [ ] `get_advisors` security/performance sem alertas inesperados; `leaked password protection` ligado.
- [ ] Segredos revisados (repo, histórico, CI); chave do Firebase restrita; keystore **de produção** (não o debug).
- [ ] Workflows publicam só da branch principal; ações fixadas por versão/SHA.
- [ ] PKCE + SecureStore; apagar conta/dados; política de privacidade e termos.
- [ ] Janelas de eventos restauradas (`supabase/patches/restore-event-windows.sql`) e dados de teste apagados.
- [ ] Sem `console.log` com dado pessoal; permissões Android mínimas (só notificações).
- [ ] `expo-doctor` e `npm audit --omit=dev` revisados.

## Como relatar

**Achei** (gravidade, arquivo:linha, cenário concreto) · **Corrigi** · **Proponho** (esforço/ganho) · **Só no
aparelho/lojas**. Segurança que muda comportamento de login ou publicação: proponha e espere o usuário decidir.
