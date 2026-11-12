# Publicar de graça no Render (modo demonstração)

> **Limite importante:** no plano grátis do Render o disco é apagado a cada reinício e a API
> "dorme" após 15 min sem uso (acorda em ~1 min). O banco SQLite volta ao estado inicial:
> produtos de exemplo, o cliente de teste `john.doe@swiftmarket.io` / `user123` e o admin que você
> definir. Pedidos, cadastros e imagens enviadas **se perdem**. Serve para apresentar o app, não
> para dados reais. Para dados reais use uma VM (veja `deploy/README.md`).

## 1. Criar a API e o painel (Blueprint)

1. Crie conta em https://render.com (entre com o GitHub).
2. **New → Blueprint** → escolha o repositório `swiftmarket` → o Render lê o `render.yaml`.
3. Preencha as variáveis pedidas:
   - `ADMIN_EMAIL`: seu e-mail de administrador (ex.: `admin@seudominio.com`)
   - `ADMIN_PASSWORD`: senha forte (mín. 8 caracteres) — **não use admin123**
   - `CORS_ORIGINS`: deixe em branco por enquanto (passo 3)
   - `VITE_API_URL`: deixe em branco por enquanto (passo 2)
4. **Apply**. Aguarde o build dos dois serviços (alguns minutos).

## 2. Apontar o painel para a API

1. Abra o serviço **swiftmarket-api** e copie a URL (ex.: `https://swiftmarket-api.onrender.com`).
   Teste `…/health` → deve responder `{"status":"ok"}`.
2. No serviço **swiftmarket-admin → Environment**, defina `VITE_API_URL` = a URL da API (sem `/` no fim)
   e faça **Manual Deploy → Clear build cache & deploy** (a variável entra no build).

## 3. Liberar o painel na API (CORS)

No serviço **swiftmarket-api → Environment**, defina `CORS_ORIGINS` = a URL do painel
(ex.: `https://swiftmarket-admin.onrender.com`). Salve (a API reinicia).

## 4. Testar

- Painel: abra a URL do painel e entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Primeiro acesso depois de um tempo parado leva ~1 min (API acordando).

## 5. Gerar o APK apontando para a API

No GitHub: **Actions → Android APK (debug) → Run workflow** e informe a URL da API
(`https://swiftmarket-api.onrender.com`). Baixe o APK em *Artifacts*. No app, entre com
`john.doe@swiftmarket.io` / `user123` ou crie uma conta.

## Observações

- Recuperação de senha: sem SMTP, o código de 6 dígitos aparece nos **Logs** da API no Render.
- Os nomes `swiftmarket-api`/`swiftmarket-admin` precisam estar livres no Render; se já existirem,
  ele acrescenta um sufixo — use sempre a URL que aparecer no serviço.
- Login Google/Apple continua desativado em produção (era simulado).
