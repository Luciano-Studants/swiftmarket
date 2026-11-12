import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = () => Capacitor.isNativePlatform();

/**
 * Botão "voltar" do Android:
 *   1. fecha o bottom sheet aberto, se houver;
 *   2. em telas internas, volta no histórico;
 *   3. numa aba raiz diferente do início, vai para o início;
 *   4. no início, sai do app.
 */
export function setupBackButton({ router, ui, homeRouteName = 'home', tabRoutes = [] }) {
  if (!isNative()) return;

  App.addListener('backButton', () => {
    if (ui.closeTopSheet()) return;

    const current = router.currentRoute.value;
    if (current.name === homeRouteName) return App.exitApp();
    if (tabRoutes.includes(current.name)) return router.replace({ name: homeRouteName });

    return router.back();
  });
}

/** Sincroniza a cor/ícones da barra de status com o tema resolvido ("light" | "dark"). */
export async function syncStatusBar(resolvedTheme) {
  if (!isNative()) return;

  const dark = resolvedTheme === 'dark';
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#0b0f14' : '#ffffff' });
  } catch {
    // Plataforma sem suporte (ex.: iOS/web): ignora.
  }
}
