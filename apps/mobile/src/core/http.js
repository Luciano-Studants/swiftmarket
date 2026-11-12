import { ApiError, createHttpClient } from '@swiftmarket/shared';

import { API_BASE, REQUEST_TIMEOUT_MS } from './config.js';

export { ApiError };

// Injetados em main.js para evitar dependência circular com as stores.
let getToken = () => null;
let onUnauthorized = () => {};

export const configureHttp = (options) => {
  if (options.getToken) getToken = options.getToken;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
};

const client = createHttpClient({
  baseUrl: API_BASE,
  timeoutMs: REQUEST_TIMEOUT_MS,
  getToken: () => getToken(),
  onUnauthorized: () => onUnauthorized(),
});

export const request = client.request;
