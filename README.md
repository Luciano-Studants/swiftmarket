# SwiftMarket

Monorepo do marketplace: **API**, **app do cliente (APK Android)** e **painel admin (web separado)**.

## Estrutura

```
swiftmarket/
├─ packages/
│  └─ shared/            # constantes, regras de preço/frete/imposto, formatação (usado por todos)
└─ apps/
   ├─ api/               # ✅ Fastify + SQLite + JWT
   ├─ mobile/            # ✅ App do cliente: Vue 3 + Capacitor -> APK (ver apps/mobile/README.md)
   └─ admin/             # ✅ Painel admin web: Vue 3 (não vai dentro do APK; ver apps/admin/README.md)
```

## API (`apps/api`)

```
src/
├─ server.js             # entrada: abre porta, bootstrap, shutdown
├─ app.js                # monta o Fastify (plugins, erros, CORS, rate-limit)
├─ routes.js             # mapa de rotas por nível de acesso
├─ config/env.js         # variáveis de ambiente
├─ core/                 # errors, validate (zod), dates
├─ db/                   # connection, migrations (versionadas), seed
├─ plugins/auth.js       # JWT + authenticate / requireAdmin
└─ modules/              # 1 pasta por funcionalidade (routes + service + schema)
   ├─ auth/  products/  favorites/  orders/  users/  dashboard/  uploads/
```

### Rodar

```bash
npm install
cp apps/api/.env.example apps/api/.env   # opcional em desenvolvimento
npm run api:dev                          # http://localhost:3333
npm run mobile:dev                       # app do cliente em http://localhost:5173
npm run admin:dev                        # painel admin em http://localhost:5174
npm test                                 # API + app do cliente + painel admin
```

Publicação com HTTPS: veja `deploy/README.md` (Docker + Caddy).

Em desenvolvimento a API cria dados demo (12 produtos e dois usuários). **Em produção** nada disso
é criado: defina `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

### Endpoints (`/api/v1`)

| Acesso  | Método e rota                                  | Descrição                                   |
| ------- | ---------------------------------------------- | ------------------------------------------- |
| público | `POST /auth/register` · `/login`               | Cadastro e login (retorna `token`)          |
| público | `POST /auth/social`                            | Google/Apple **simulado** (só em dev)       |
| público | `POST /auth/forgot-password`                   | Simulado (sempre 202)                       |
| público | `GET /products` · `GET /products/:id`          | Vitrine: busca, categoria, ordem, página    |
| cliente | `GET/PATCH /me` · `PUT /me/preferences`        | Perfil, endereço, preferências              |
| cliente | `GET /me/favorites` · `PUT/DELETE /:productId` | Favoritos (idempotente)                     |
| cliente | `POST /orders` · `GET /orders/:id`             | Criar pedido / ver pedido próprio           |
| cliente | `POST /orders/:id/cancel`                      | Cancela (só antes do envio); estoque volta  |
| cliente | `GET /me/orders`                               | Histórico                                   |
| cliente | `POST /orders/preview`                         | Totais com cupom, sem criar pedido          |
| público | `GET /products/:id/reviews`                    | Avaliações visíveis + resumo por estrela    |
| cliente | `GET/PUT/DELETE /me/reviews/:productId`        | Avaliar (só quem recebeu o produto)         |
| cliente | `GET /me/notifications` · `/unread-count`      | Notificações; `POST /read-all`, `/:id/read` |
| admin   | `GET /admin/reviews` · `PATCH /:id`            | Moderação (ocultar/mostrar)                 |
| admin   | `CRUD /admin/coupons`                          | Cupons (% ou valor fixo, mínimo, limite)    |
| admin   | `GET /admin/dashboard`                         | Métricas reais, vendas 7 dias, estoque      |
| admin   | `CRUD /admin/products`                         | Inclui rascunhos; filtro `?status=`         |
| admin   | `GET /admin/orders` · `PATCH /:id/status`      | Pedidos com cliente; filtro `?status=`      |
| admin   | `GET /admin/users`                             | Usuários                                    |
| admin   | `POST /admin/uploads`                          | Imagem de produto (jpg/png/webp, 1,5 MB)    |

Erros: `{ "error": { "code": "INSUFFICIENT_STOCK", "details": {...} } }`. O `code` é estável e cada
app o traduz para pt-BR.

### Ciclo de vida do pedido

`confirmed → shipped → delivered`, e `confirmed → cancelled`. `delivered` e `cancelled` são finais;
não se pula etapa nem se reabre pedido (`409 INVALID_STATUS_TRANSITION`). A regra mora em
`packages/shared` (`ORDER_TRANSITIONS`) e o servidor é quem decide: o painel só mostra as opções
válidas. Cancelar devolve o estoque na mesma transação (uma única vez, mesmo com requisições
simultâneas) e cada mudança fica em `order_events` (histórico exibido no app e no painel).
Cliente cancela só o próprio pedido; avançar o pedido é do admin.

### Diferenciais: confiança, conversão e retorno

- **Avaliações verificadas**: só avalia quem tem pedido `delivered` com o produto (1 por produto e
  cliente). A nota do produto é a média das avaliações visíveis (0 = sem avaliações, exibido como
  "Novo"); nome público abreviado ("João S."); o admin pode ocultar.
- **Cupons validados no servidor**: percentual (1–90%) ou valor fixo, mínimo de subtotal, limite de
  usos, validade e 1 uso por cliente. O desconto não incide sobre o frete; imposto e frete grátis
  usam o valor já descontado. Cancelar o pedido libera o cupom.
- **Notificações no app**: criadas quando o admin muda a situação do pedido; o app consulta a cada
  60 s e ao voltar para a aba (sem push/FCM ainda).

### Contas e sessões

- **Recuperação de senha por código** (6 dígitos, 15 min, 5 tentativas, 3 por hora, uso único,
  guardado só como HMAC). Foi escolhido código e não link porque um link de e-mail num APK exige
  deep links; o código é digitado no próprio app. `forgot-password` responde igual exista ou não o
  e-mail (e não espera o envio, para o tempo também não revelar contas).
- **Revogação de sessões**: o JWT leva `tv` (versão do token do usuário). Trocar ou redefinir a
  senha incrementa a versão e invalida todos os tokens antigos.
- **E-mail**: `SMTP_URL` + `MAIL_FROM`. Em desenvolvimento, sem SMTP o código sai no log da API;
  em produção `SMTP_URL` é obrigatório.

- **Regra de senha**: mínimo de 8 caracteres (`PASSWORD` em `packages/shared`) no cadastro, na
  redefinição e na troca. Contas antigas com senha curta continuam entrando (o login não valida o
  tamanho). Em produção, `ADMIN_PASSWORD` também precisa ter 8+.
- O painel admin tem a tela **Alterar senha** (menu lateral).

### Decisões de arquitetura

- **Dinheiro em centavos (inteiros)**: sem erro de ponto flutuante. Formatação só na borda (`formatMoney`).
- **Totais recalculados no servidor** (`calcTotals`), nunca aceitos do cliente. Estoque baixa numa
  transação com guarda `stock >= qtd` (sem estoque negativo em pedidos simultâneos).
- **Autorização por grupo de rotas** (`onRequest`), não por rota: esquecer uma checagem não abre uma rota.
- **Banco atrás de services**: trocar SQLite por PostgreSQL mexe só em `db/` e nos `*.service.js`.
- **Migrations versionadas** (`PRAGMA user_version`): nunca editar uma já publicada.
- **Imagens em disco** (`/uploads`), não em base64.
