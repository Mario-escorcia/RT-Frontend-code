// Production: serve the app and the API under the same origin (reverse proxy /api -> backend),
// or replace apiUrl with the absolute backend URL (and add it to CORS_ORIGIN on the backend).
export const environment = {
  production: true,
  apiUrl: '/api',
};
