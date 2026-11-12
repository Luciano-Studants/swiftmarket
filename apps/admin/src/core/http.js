import { ApiError, createHttpClient } from '@swiftmarket/shared';

import { API_BASE } from './config.js';

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
  getToken: () => getToken(),
  onUnauthorized: () => onUnauthorized(),
});

export const request = client.request;
