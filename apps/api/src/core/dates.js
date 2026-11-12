/** Converte o `datetime('now')` do SQLite (UTC, "YYYY-MM-DD HH:MM:SS") para ISO 8601. */
export const toIso = (sqliteDate) => (sqliteDate ? `${sqliteDate.replace(' ', 'T')}Z` : null);
