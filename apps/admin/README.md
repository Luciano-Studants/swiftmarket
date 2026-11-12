# SwiftMarket · Painel administrativo

Web app em Vue 3 + Vite + Pinia + vue-i18n (pt-BR), **separado do APK**: o app do cliente não
leva nenhum código de administração. Usa a mesma identidade visual (tokens compartilhados em
`packages/shared`) e a mesma API; toda autorização é decidida **no servidor** (`/api/v1/admin/*`).

## Telas

| Rota                  | Tela                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| `#/login`             | Login só para administradores (conta de cliente é recusada)                            |
| `#/`                  | Painel: vendas, pedidos, clientes, produtos, gráfico dos últimos 7 dias, estoque baixo |
| `#/products`          | Lista com busca, filtro de categoria/situação, paginação e exclusão com confirmação    |
| `#/products/new`      | Cadastro com validação, preço em R$ e upload de imagem (JPG/PNG/WebP até 1,5 MB)       |
| `#/products/:id/edit` | Edição do produto                                                                      |
| `#/orders`            | Pedidos com cliente, filtro por situação, detalhes e troca de situação                 |
| `#/users`             | Usuários cadastrados                                                                   |
| `#/reviews`           | Moderação de avaliações (ocultar/mostrar; vê nome completo e e-mail)                   |
| `#/coupons`           | Cupons: criar, ativar/desativar, excluir (se nunca usado)                              |
| `#/account/password`  | Alterar a própria senha                                                                |

## Estrutura

```
src/
├─ main.js, App.vue          # bootstrap e casca (menu lateral + conteúdo)
├─ router/                   # rotas (lazy) e guards
├─ core/                     # config, http (cliente compartilhado), storage, money, format, errors
├─ i18n/pt-BR.js             # todos os textos e mensagens de erro da API
├─ stores/                   # Pinia: auth, theme, ui
├─ composables/              # useRequestState
├─ components/               # AppShell, SalesBarChart, StatCard, StatusBadge, ConfirmDialog, ...
├─ features/                 # 1 pasta por funcionalidade: *.api.js + telas (*View.vue)
│  └─ auth/ dashboard/ products/ orders/ users/
└─ styles/admin.css
```

## Rodar

```bash
# na raiz do monorepo
npm install
npm run api:dev          # API em http://localhost:3333
npm run admin:dev        # painel em http://localhost:5174
npm run admin:test       # testes unitários
npm run admin:build      # gera apps/admin/dist (arquivos estáticos)
```

Conta de demonstração (só em desenvolvimento): `admin@swiftmarket.com` / `admin123`.

## Produção

- Hospede `apps/admin/dist` em qualquer servidor de arquivos estáticos (usa rotas com `#`, então
  não precisa de configuração de rewrite).
- Defina `VITE_API_URL=https://api.seudominio.com` **antes** do build (veja `.env.example`).
- Na API, inclua a origem do painel em `CORS_ORIGINS` (ex.: `https://admin.seudominio.com`).
- Crie o primeiro administrador com `ADMIN_EMAIL` e `ADMIN_PASSWORD` na API (em produção os
  usuários de demonstração **não** existem).

## Decisões

- **Sessão em `sessionStorage`**: o token some ao fechar a aba (painel administrativo não deve
  manter token por semanas no navegador). O tema fica em `localStorage`.
- **Tema escuro por padrão**, alternável no menu; a escolha é lembrada no navegador.
- **Dinheiro**: o formulário aceita `1.299,90`; a API só recebe centavos inteiros.
- **Gráfico de vendas**: uma série (sem legenda), barras com topo de 4px arredondado, tooltip por
  barra (mouse e teclado), rótulo direto só no pico e botão "Ver como tabela" (acessibilidade).
- Mensagens do vue-i18n: `@`, `|` e `{}` são especiais; escreva `{'@'}` para o literal (o teste
  `tests/i18n.test.js` compila todas as mensagens).
