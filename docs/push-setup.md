# Push dos círculos — configuração (uma vez só)

O app já guarda os avisos dos círculos ("fulano orou por você", "fulano torceu por você" etc.) e
mostra tudo na aba Círculos, com um selo na aba. Para o aviso também chegar como **notificação**
com o app fechado, o Google (Firebase Cloud Messaging) precisa entregar a mensagem. São 3 passos.
Sem eles nada quebra: só não chega a notificação, e os avisos continuam dentro do app.

## 1. Criar o projeto no Firebase (grátis)
1. Acesse https://console.firebase.google.com → **Adicionar projeto** → nome "Lumi" (pode desligar o Google Analytics).
2. No projeto: **Visão geral → ícone do Android** (Adicionar app).
3. Nome do pacote Android: **`com.lumi.app`** (exatamente assim). Apelido opcional. Toque em **Registrar app**.
4. **Baixe o `google-services.json`** e avance até o fim (pode ignorar os passos de código).

## 2. Entregar o `google-services.json` ao build (GitHub)
1. Converta o arquivo em uma linha de base64. No Termux/Linux/Mac: `base64 -w0 google-services.json`
   (no Mac: `base64 -i google-services.json`). Pelo celular, também serve um site "arquivo para base64".
2. GitHub → repositório `wensch/lumi` → **Settings → Secrets and variables → Actions → New repository secret**.
3. Nome: **`GOOGLE_SERVICES_JSON_BASE64`**. Valor: o texto de uma linha só. Salve.

## 3. Entregar a chave do servidor ao Supabase
1. Firebase → ⚙️ **Configurações do projeto → Contas de serviço → Gerar nova chave privada**. Baixa um `.json`.
2. Supabase → **Edge Functions → Secrets** (ou *Project Settings → Edge Functions*) → **Add new secret**.
3. Nome: **`FCM_SERVICE_ACCOUNT`**. Valor: **o conteúdo inteiro** do `.json` baixado. Salve.
   (Essa chave é secreta: não cole em chat, e-mail nem no repositório.)
4. A função `notify-circle-events` já está publicada; ela passa a enviar assim que o segredo existir.

## Depois
- Dispare um build novo (qualquer push em `app/` ou `src/`, ou **Actions → Build APK → Run workflow**).
  No log, o passo "Firebase config (optional)" deve mostrar "google-services.json OK".
- Instale o APK, aceite as notificações, entre num círculo com duas contas e teste torcer / orar.
- Se não chegar: confira em **Configurações → Avisos dos círculos** (ligado) e as notificações do Lumi
  no sistema do celular (canal "Avisos dos círculos").

## Como funciona (resumo técnico)
- `register_device_token` guarda o token FCM do aparelho; `deactivate_device_token` o desativa ao sair da conta.
- As funções de torcer / orar / gratidão / novo pedido gravam linhas em `circle_events` (migration 00018).
- Logo depois da ação, o app chama a edge function `notify-circle-events`, que identifica a pessoa pelo
  JWT, pega só os avisos que **ela** gerou e ainda não foram enviados, respeita `circles_enabled` do
  destinatário, escolhe o idioma (`notification_preferences.language`) e envia via FCM HTTP v1.
- O texto do pedido de oração **não** vai na notificação (tela bloqueada). Tocar abre o círculo.
