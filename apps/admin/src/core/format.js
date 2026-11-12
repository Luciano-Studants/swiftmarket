/** Data e hora curtas em pt-BR (ex.: "11/11/2026, 08:34"). */
export const formatDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : '';

/** Data curta (ex.: "11/11/2026"). */
export const formatDate = (iso) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso)) : '';
