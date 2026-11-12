# SwiftMarket · App do cliente (Android)

Vue 3 + Vite + Pinia + vue-i18n (pt-BR), empacotado com Capacitor. O painel admin **não** faz parte
deste app (fica em `apps/admin`).

## Estrutura

```
src/
├─ main.js                # bootstrap: restaura tema, carrinho e sessão antes de abrir
├─ App.vue                # casca: transição de telas, barra inferior, toast
├─ router/                # rotas (lazy), guards de login, abas
├─ core/                  # config, http (fetch + erros), storage, plataforma Android, sessão
├─ i18n/                  # pt-BR.js (todos os textos + mensagens de erro da API)
├─ stores/                # Pinia: auth, cart, favorites, theme, ui
├─ composables/           # useRequestState, useProductActions
├─ components/            # Header, BottomNav, BottomSheet, ProductCard, ...
├─ features/              # 1 pasta por funcionalidade: *.api.js + telas (*View.vue)
│  ├─ auth/  home/  catalog/  favorites/  cart/  checkout/  profile/
└─ styles/                # tokens (tema), base, components
```

Regra: telas falam com `stores` e `features/*/**.api.js`; só `core/http.js` chama `fetch`.

## Desenvolvimento no navegador

```bash
# na raiz do monorepo
npm install
npm run api:dev          # API em http://localhost:3333
npm run mobile:dev       # app em http://localhost:5173 (use o modo celular do navegador)
npm run mobile:test      # testes unitários
```

Conta de demonstração (só em desenvolvimento): `john.doe@swiftmarket.io` / `user123`.

## Gerar o APK

**Sem Android Studio (GitHub Actions):** suba o projeto para um repositório no GitHub, abra
**Actions ▸ Android APK (debug) ▸ Run workflow**, informe a URL HTTPS da API e baixe o
`swiftmarket-debug-apk` em _Artifacts_. É um APK de teste; o de loja precisa de assinatura.

**Com Android Studio:**

Requisitos na sua máquina: **Android Studio** (traz o SDK e o JDK) e Node 22+.

```bash
cp apps/mobile/.env.example apps/mobile/.env     # ajuste VITE_API_URL (veja abaixo)
npm run mobile:android                           # build web + sincroniza com o projeto Android
npm run mobile:open                              # abre no Android Studio
```

No Android Studio: **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)**. O arquivo sai em
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`; copie para o celular e instale
(permita "instalar apps desconhecidos"). Para publicar na Play Store é preciso um APK/AAB
**assinado** (Build ▸ Generate Signed Bundle / APK).

Compatibilidade: Android 7.0+ (minSdk 24).

### Endereço da API no celular (importante)

O app instalado roda em `https://localhost`, e o Android **bloqueia chamadas `http://`** a partir
dele (conteúdo misto). Por isso:

| Cenário                    | `VITE_API_URL`               | O que mais fazer                                         |
| -------------------------- | ---------------------------- | -------------------------------------------------------- |
| Produção / teste real      | `https://api.seudominio.com` | Publicar a API atrás de HTTPS e liberar a origem no CORS |
| Emulador sem HTTPS (teste) | `http://10.0.2.2:3333`       | Ver "Teste sem HTTPS" abaixo                             |
| Celular na mesma rede      | `http://IP-DO-PC:3333`       | Idem                                                     |

**Teste sem HTTPS (somente desenvolvimento):** em `capacitor.config.json` troque
`"androidScheme": "https"` por `"androidScheme": "http"` e adicione `"cleartext": true` dentro de
`server`; rode `npm run mobile:android` de novo. **Não publique assim.**

### Variáveis de ambiente do app

| Variável             | Padrão                  | Descrição                                                     |
| -------------------- | ----------------------- | ------------------------------------------------------------- |
| `VITE_API_URL`       | `http://localhost:3333` | Origem da API (sem `/api/v1`). É embutida no build.           |
| `VITE_ENABLE_SOCIAL` | `false`                 | Mostra os botões Google/Apple simulados em build de produção. |

## Decisões

- **Tema** é preferência do aparelho (Capacitor Preferences), padrão **escuro**; "Automático" segue o sistema.
- **Carrinho** fica no aparelho; o servidor revalida preço/estoque e recalcula os totais no pedido.
- **Fontes** (Inter e JetBrains Mono) são empacotadas: o app abre sem internet para a parte visual.
- **Botão voltar do Android**: fecha o sheet aberto → volta uma tela → de uma aba vai ao início → no início sai do app.
- **Erros da API** chegam como códigos estáveis e são traduzidos em `i18n/pt-BR.js` (`errors.*`).
- Mensagens do vue-i18n: `@`, `|` e `{}` têm significado especial; escreva `{'@'}` para o literal
  (o teste `tests/i18n.test.js` compila todas as mensagens e falha se alguma quebrar).

## Ícone e splash

Identidade: sacola com raio, gradiente `#06b6d4 → #6366f1`, fundo `#0b0f14` (tema escuro padrão).
Os arquivos já estão em `android/app/src/main/res` (ícone legado, redondo, adaptive foreground/background
e splash retrato/paisagem em todas as densidades). Para trocar pela sua logo, substitua os PNGs de
`assets/` (`icon-only`, `icon-foreground`, `icon-background`, `splash`, `splash-dark`) e rode:

```bash
npx @capacitor/assets generate --android
```

O `assets/icon.svg` é a fonte vetorial do ícone. O foreground adaptive mantém a marca dentro da
zona segura (66/108) para não ser cortada pelas máscaras de cada fabricante.
