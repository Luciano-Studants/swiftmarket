# Publicação (API + painel admin com HTTPS)

Uma VPS com Docker (≈ 1 GB de RAM basta) roda tudo: **API**, **painel admin** e **Caddy**, que emite
e renova o certificado HTTPS sozinho. O banco SQLite e os uploads ficam no volume `swiftmarket-data`.

## Passo a passo

1. **DNS**: crie dois registros A apontando para o IP do servidor, por exemplo
   `api.seudominio.com` e `admin.seudominio.com`. Libere as portas 80 e 443 no firewall.
2. **Configuração**:
   ```bash
   cp deploy/.env.production.example .env
   openssl rand -hex 48        # cole o resultado em JWT_SECRET
   # preencha também API_DOMAIN, ADMIN_DOMAIN, ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_URL e MAIL_FROM
   ```
3. **Subir**: `docker compose up -d --build`
4. **Conferir**: `https://api.seudominio.com/health` deve responder `{"status":"ok"}` e o painel
   abre em `https://admin.seudominio.com` (entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
5. **APK**: gere com a URL da API: `VITE_API_URL=https://api.seudominio.com npm run mobile:build`,
   depois `npm run mobile:android` e compile no Android Studio. O CORS já aceita `https://localhost`
   (origem do APK).

## Operação

- **Logs**: `docker compose logs -f api`
- **Atualizar**: `git pull && docker compose up -d --build` (migrations rodam sozinhas na subida)
- **Backup**: `./deploy/backup.sh ./backups` (cópia consistente do SQLite + uploads). Agende no cron
  (ex.: diário) e leve uma cópia para fora do servidor.

## Segurança já embutida

- A API **não** é publicada no host: só o Caddy a alcança. Por isso `TRUST_PROXY=true` é seguro
  aqui; **nunca** ative essa variável com a API exposta direto na internet (burla o rate limit).
- Em produção não existem usuários/produtos de demonstração nem login social simulado.
- Contêiner da API roda como usuário sem privilégios, com healthcheck.
- Troque a senha do admin depois do primeiro acesso e guarde o `.env` fora do repositório.

## Limites conhecidos

- SQLite atende bem uma instância única; para várias réplicas ou alto volume, migre para PostgreSQL
  (só `db/` e os `*.service.js` mudam).
- Login Google/Apple e PIX continuam **simulados** (decisão do projeto): produção real exige integrar
  os provedores.
- Sem refresh token: o JWT dura 7 dias, mas trocar/redefinir a senha derruba todas as sessões
  (`token_version`). Se precisar de sessões curtas com renovação, é uma evolução à parte.
- A API **não sobe em produção sem `SMTP_URL`** (recuperação de senha depende dele). Configure o
  SPF/DKIM do domínio no provedor de e-mail, senão os códigos caem no spam.
- O painel admin ainda não tem tela de troca de senha (use a recuperação pelo app/API).
