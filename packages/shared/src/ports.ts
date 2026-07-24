/**
 * Local development ports — all services use the 4000 range.
 * Override via environment variables in each app.
 */
export const PORTS = {
  /** Sovereign API: /api/* and /demo-api/* */
  apiGateway: 4000,
  /** React IDE (Vite dev server) */
  web: 4001,
  /** Compiled Login/Blog static site (serve / E2E) */
  compiledStatic: 4010,
  /** Go PQC microservice (internal) */
  cryptoService: 4081,
  /** PostgreSQL (Docker production) */
  postgres: 5432,
} as const;

export function apiGatewayUrl(host = "localhost") {
  return `http://${host}:${PORTS.apiGateway}`;
}

export function webUrl(host = "localhost") {
  return `http://${host}:${PORTS.web}`;
}

export function compiledStaticUrl(host = "localhost") {
  return `http://${host}:${PORTS.compiledStatic}`;
}

export function cryptoServiceUrl(host = "localhost") {
  return `http://${host}:${PORTS.cryptoService}`;
}
