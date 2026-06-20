/**
 * API-key auth primitives for the Hydra TCG Platform.
 *
 * The module is intentionally storage-agnostic. API routes or CLI commands
 * persist ApiKeyCredential records and only show the raw api_key once.
 */

export const AUTH_API_KEY_SECRET_ENV = "HYDRA_API_KEY_SECRET";
export const AUTH_API_KEY_ISSUER_ENV = "HYDRA_AUTH_ISSUER";
export const DEFAULT_AUTH_ISSUER = "card-trade-social";
export const API_KEY_PREFIX = "hka";
export const MIN_API_KEY_SECRET_LENGTH = 32;

export const API_KEY_SCOPES = [
  "cards:read",
  "pricing:read",
  "pricing:write",
  "portfolio:read",
  "portfolio:write",
  "trades:read",
  "trades:write",
  "billing:read",
  "billing:write",
  "social:read",
  "social:write",
  "game:read",
  "game:write",
  "genai:write",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const DEFAULT_API_KEY_SCOPES: ApiKeyScope[] = [
  "cards:read",
  "pricing:read",
  "portfolio:read",
  "trades:read",
  "billing:read",
];

export type ApiKeyStatus = "active" | "revoked";

export type AuthErrorCode =
  | "missing_api_key"
  | "malformed_api_key"
  | "unknown_api_key"
  | "revoked_api_key"
  | "expired_api_key"
  | "invalid_api_key"
  | "missing_scope"
  | "user_mismatch"
  | "unknown_endpoint"
  | "misconfigured_secret"
  | "crypto_unavailable";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthConfig {
  api_key_secret: string;
  issuer: string;
}

export interface AuthEnv {
  [key: string]: string | undefined;
}

export interface ApiKeyCredential {
  key_id: string;
  user_id: string;
  key_hash: string;
  key_last4: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  issuer: string;
  name?: string;
  created_at: Date;
  expires_at?: Date;
  last_used_at?: Date;
}

export interface IssuedApiKey {
  api_key: string;
  credential: ApiKeyCredential;
}

export interface ApiKeyIssueParams {
  user_id: string;
  config: AuthConfig;
  scopes?: ApiKeyScope[];
  key_id?: string;
  name?: string;
  expires_at?: Date;
  now?: Date;
  randomBytes?: (byteLength: number) => Uint8Array;
}

export type ApiKeyCredentialStore =
  | ApiKeyCredential[]
  | Map<string, ApiKeyCredential>
  | Record<string, ApiKeyCredential | undefined>;

export interface ApiKeyVerificationOptions {
  required_scopes?: ApiKeyScope[];
  now?: Date;
}

export interface AuthenticatedUser {
  key_id: string;
  user_id: string;
  scopes: ApiKeyScope[];
  authenticated_at: Date;
}

export interface ApiKeyVerificationResult {
  valid: boolean;
  auth?: AuthenticatedUser;
  credential?: ApiKeyCredential;
  error?: AuthErrorCode;
  message?: string;
}

export type EndpointMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "WS";

export interface EndpointAuthRule {
  method: EndpointMethod;
  path: string;
  scope: ApiKeyScope;
  description: string;
}

export type HeaderRecord = Record<string, string | string[] | undefined>;

export interface EndpointAuthorizationParams {
  method: string;
  path: string;
  config: AuthConfig;
  credentials: ApiKeyCredentialStore;
  api_key?: string;
  headers?: HeaderRecord;
  now?: Date;
  rules?: EndpointAuthRule[];
}

export interface EndpointAuthorization {
  auth: AuthenticatedUser;
  endpoint: EndpointAuthRule;
  required_scope: ApiKeyScope;
}

export const PRIMARY_ENDPOINT_AUTH_RULES: EndpointAuthRule[] = [
  {
    method: "GET",
    path: "/api/v1/cards/:id/price",
    scope: "pricing:read",
    description: "Read Hydra Price and source breakdown for a card.",
  },
  {
    method: "GET",
    path: "/api/v1/cards/search",
    scope: "cards:read",
    description: "Search the card catalog.",
  },
  {
    method: "GET",
    path: "/api/v1/portfolio/:userId",
    scope: "portfolio:read",
    description: "Read a user's portfolio valuation snapshot.",
  },
  {
    method: "POST",
    path: "/api/v1/portfolio/holdings",
    scope: "portfolio:write",
    description: "Add cards to a user portfolio.",
  },
  {
    method: "GET",
    path: "/api/v1/alerts/arbitrage",
    scope: "pricing:read",
    description: "Read active arbitrage opportunities.",
  },
  {
    method: "WS",
    path: "/ws/prices",
    scope: "pricing:read",
    description: "Subscribe to the real-time price stream.",
  },
  {
    method: "GET",
    path: "/api/v1/feed/:userId",
    scope: "social:read",
    description: "Read a social activity feed.",
  },
  {
    method: "POST",
    path: "/api/v1/guilds",
    scope: "social:write",
    description: "Create a guild.",
  },
  {
    method: "POST",
    path: "/api/v1/creators/buylist",
    scope: "social:write",
    description: "Publish a curated creator buy list.",
  },
  {
    method: "GET",
    path: "/api/v1/copy-trade/:creatorId",
    scope: "trades:read",
    description: "Read copy-trade signals.",
  },
  {
    method: "POST",
    path: "/api/v1/trades",
    scope: "trades:write",
    description: "Create a trade proposal.",
  },
  {
    method: "GET",
    path: "/api/v1/trades",
    scope: "trades:read",
    description: "List authenticated user trades.",
  },
  {
    method: "POST",
    path: "/api/v1/trades/:id/accept",
    scope: "trades:write",
    description: "Accept a pending trade.",
  },
  {
    method: "POST",
    path: "/api/v1/trades/:id/reject",
    scope: "trades:write",
    description: "Reject a pending trade.",
  },
  {
    method: "POST",
    path: "/api/v1/trades/:id/cancel",
    scope: "trades:write",
    description: "Cancel a pending trade.",
  },
  {
    method: "POST",
    path: "/api/v1/trades/:id/counter",
    scope: "trades:write",
    description: "Counter a pending trade.",
  },
  {
    method: "GET",
    path: "/api/v1/game/profile",
    scope: "game:read",
    description: "Read game profile data.",
  },
  {
    method: "POST",
    path: "/api/v1/game/quest/complete",
    scope: "game:write",
    description: "Mark a daily quest complete.",
  },
  {
    method: "GET",
    path: "/api/v1/game/leagues",
    scope: "game:read",
    description: "Read current league standings.",
  },
  {
    method: "POST",
    path: "/api/v1/genai/fuse",
    scope: "genai:write",
    description: "Generate a fused concept card.",
  },
  {
    method: "POST",
    path: "/api/v1/genai/input-scan",
    scope: "genai:write",
    description: "Generate a card from an external input.",
  },
  {
    method: "POST",
    path: "/api/v1/genai/proxy-print",
    scope: "genai:write",
    description: "Generate a print-ready proxy PDF.",
  },
  {
    method: "POST",
    path: "/api/v1/billing/checkout/pro",
    scope: "billing:write",
    description: "Create a Pro checkout session.",
  },
  {
    method: "POST",
    path: "/api/v1/billing/checkout/iap",
    scope: "billing:write",
    description: "Create an in-app purchase checkout session.",
  },
  {
    method: "POST",
    path: "/api/v1/billing/webhook",
    scope: "billing:write",
    description: "Apply billing provider webhook events.",
  },
  {
    method: "GET",
    path: "/api/v1/billing/entitlements",
    scope: "billing:read",
    description: "Read current tier, limits, and feature gates.",
  },
];

const API_KEY_SCOPE_SET = new Set<string>(API_KEY_SCOPES);

export function createAuthConfig(params: {
  api_key_secret?: string;
  issuer?: string;
}): AuthConfig {
  const secret = params.api_key_secret;
  if (secret === undefined || secret.trim() === "") {
    throw new AuthError(
      "misconfigured_secret",
      `${AUTH_API_KEY_SECRET_ENV} is required for API-key auth`
    );
  }
  if (secret.length < MIN_API_KEY_SECRET_LENGTH) {
    throw new AuthError(
      "misconfigured_secret",
      `${AUTH_API_KEY_SECRET_ENV} must be at least ${MIN_API_KEY_SECRET_LENGTH} characters`
    );
  }

  return {
    api_key_secret: secret,
    issuer: normalizeOptionalIssuer(params.issuer),
  };
}

export function createAuthConfigFromEnv(env: AuthEnv): AuthConfig {
  return createAuthConfig({
    api_key_secret: env[AUTH_API_KEY_SECRET_ENV],
    issuer: env[AUTH_API_KEY_ISSUER_ENV],
  });
}

export async function issueApiKey(
  params: ApiKeyIssueParams
): Promise<IssuedApiKey> {
  assertNonEmpty(params.user_id, "user_id");
  const scopes = normalizeScopes(params.scopes ?? DEFAULT_API_KEY_SCOPES);
  const key_id = params.key_id ?? `ak-${randomHex(8, params.randomBytes)}`;
  assertKeyId(key_id);
  if (params.name !== undefined) {
    assertNonEmpty(params.name, "name");
  }

  const tokenSecret = randomHex(32, params.randomBytes);
  const api_key = `${API_KEY_PREFIX}_${key_id}_${tokenSecret}`;
  const key_hash = await hashApiKey(params.config, api_key);
  const now = params.now ?? new Date();

  return {
    api_key,
    credential: {
      key_id,
      user_id: params.user_id,
      key_hash,
      key_last4: api_key.slice(-4),
      scopes,
      status: "active",
      issuer: params.config.issuer,
      name: params.name,
      created_at: now,
      expires_at: params.expires_at,
    },
  };
}

export async function verifyApiKey(
  api_key: string | undefined,
  credentials: ApiKeyCredentialStore,
  config: AuthConfig,
  options: ApiKeyVerificationOptions = {}
): Promise<ApiKeyVerificationResult> {
  try {
    const { auth, credential } = await requireApiKey(
      api_key,
      credentials,
      config,
      options
    );
    return {
      valid: true,
      auth,
      credential,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        valid: false,
        error: error.code,
        message: error.message,
      };
    }
    throw error;
  }
}

export async function requireApiKey(
  api_key: string | undefined,
  credentials: ApiKeyCredentialStore,
  config: AuthConfig,
  options: ApiKeyVerificationOptions = {}
): Promise<{ auth: AuthenticatedUser; credential: ApiKeyCredential }> {
  if (api_key === undefined || api_key.trim() === "") {
    throw new AuthError("missing_api_key", "API key is required");
  }

  const parsed = parseApiKey(api_key);
  if (parsed === undefined) {
    throw new AuthError("malformed_api_key", "API key format is invalid");
  }

  const credential = lookupCredential(credentials, parsed.key_id);
  if (credential === undefined) {
    throw new AuthError("unknown_api_key", "API key is not registered");
  }
  if (credential.status === "revoked") {
    throw new AuthError("revoked_api_key", "API key has been revoked");
  }
  if (credential.issuer !== config.issuer) {
    throw new AuthError("invalid_api_key", "API key issuer does not match");
  }

  const now = options.now ?? new Date();
  if (
    credential.expires_at !== undefined &&
    credential.expires_at.getTime() <= now.getTime()
  ) {
    throw new AuthError("expired_api_key", "API key has expired");
  }

  const expectedHash = await hashApiKey(config, api_key.trim());
  if (!constantTimeEqual(credential.key_hash, expectedHash)) {
    throw new AuthError("invalid_api_key", "API key secret is invalid");
  }

  const scopes = normalizeScopes(credential.scopes);
  for (const scope of options.required_scopes ?? []) {
    if (!scopes.includes(scope)) {
      throw new AuthError(
        "missing_scope",
        `API key is missing required scope: ${scope}`
      );
    }
  }

  return {
    auth: {
      key_id: credential.key_id,
      user_id: credential.user_id,
      scopes,
      authenticated_at: now,
    },
    credential,
  };
}

export function hasScope(auth: AuthenticatedUser, scope: ApiKeyScope): boolean {
  return auth.scopes.includes(scope);
}

export function requireScope(
  auth: AuthenticatedUser,
  scope: ApiKeyScope
): void {
  if (!hasScope(auth, scope)) {
    throw new AuthError(
      "missing_scope",
      `Authenticated user is missing required scope: ${scope}`
    );
  }
}

export function requireUser(
  auth: AuthenticatedUser,
  user_id: string,
  resource: string = "resource"
): void {
  if (auth.user_id !== user_id) {
    throw new AuthError(
      "user_mismatch",
      `Authenticated user cannot access ${resource} for ${user_id}`
    );
  }
}

export function extractApiKeyFromHeaders(
  headers: HeaderRecord | undefined
): string | undefined {
  if (headers === undefined) {
    return undefined;
  }

  const authorization = getHeader(headers, "authorization");
  if (authorization !== undefined) {
    const trimmed = authorization.trim();
    const bearer = /^bearer\s+(.+)$/i.exec(trimmed);
    if (bearer !== null) {
      return bearer[1].trim();
    }
    const apiKey = /^apikey\s+(.+)$/i.exec(trimmed);
    if (apiKey !== null) {
      return apiKey[1].trim();
    }
  }

  return (
    getHeader(headers, "x-hydra-api-key")?.trim() ??
    getHeader(headers, "x-api-key")?.trim()
  );
}

export function findEndpointAuthRule(
  method: string,
  path: string,
  rules: EndpointAuthRule[] = PRIMARY_ENDPOINT_AUTH_RULES
): EndpointAuthRule | undefined {
  const normalizedMethod = normalizeMethod(method);
  const normalizedPath = normalizePath(path);

  return rules.find(
    (rule) =>
      rule.method === normalizedMethod &&
      endpointPathMatches(rule.path, normalizedPath)
  );
}

export async function authorizeEndpoint(
  params: EndpointAuthorizationParams
): Promise<EndpointAuthorization> {
  const endpoint = findEndpointAuthRule(
    params.method,
    params.path,
    params.rules ?? PRIMARY_ENDPOINT_AUTH_RULES
  );
  if (endpoint === undefined) {
    throw new AuthError(
      "unknown_endpoint",
      `No API-key auth rule is configured for ${params.method.toUpperCase()} ${params.path}`
    );
  }

  const api_key = params.api_key ?? extractApiKeyFromHeaders(params.headers);
  const { auth } = await requireApiKey(
    api_key,
    params.credentials,
    params.config,
    {
      required_scopes: [endpoint.scope],
      now: params.now,
    }
  );

  return {
    auth,
    endpoint,
    required_scope: endpoint.scope,
  };
}

function normalizeScopes(scopes: ApiKeyScope[]): ApiKeyScope[] {
  if (scopes.length === 0) {
    throw new Error("At least one API key scope is required");
  }

  const unique: ApiKeyScope[] = [];
  for (const scope of scopes) {
    if (!API_KEY_SCOPE_SET.has(scope)) {
      throw new Error(`Unknown API key scope: ${scope}`);
    }
    if (!unique.includes(scope)) {
      unique.push(scope);
    }
  }

  return unique;
}

function normalizeOptionalIssuer(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_AUTH_ISSUER;
  }

  return value.trim();
}

function assertNonEmpty(value: string | undefined, field: string): asserts value is string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
}

function assertKeyId(value: string): void {
  if (!/^[A-Za-z0-9-]{4,64}$/.test(value)) {
    throw new Error("key_id must be 4-64 characters using letters, numbers, or hyphens");
  }
}

function parseApiKey(
  api_key: string
): { key_id: string; token_secret: string } | undefined {
  const match = /^hka_([A-Za-z0-9-]{4,64})_([A-Fa-f0-9]{64})$/.exec(
    api_key.trim()
  );
  if (match === null) {
    return undefined;
  }

  return {
    key_id: match[1],
    token_secret: match[2],
  };
}

function lookupCredential(
  credentials: ApiKeyCredentialStore,
  key_id: string
): ApiKeyCredential | undefined {
  if (Array.isArray(credentials)) {
    return credentials.find((credential) => credential.key_id === key_id);
  }
  if (credentials instanceof Map) {
    return credentials.get(key_id);
  }

  return credentials[key_id];
}

async function hashApiKey(config: AuthConfig, api_key: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.subtle === undefined) {
    throw new AuthError(
      "crypto_unavailable",
      "Web Crypto API is required for API-key hashing"
    );
  }

  const encoder = new TextEncoder();
  const key = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(config.api_key_secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  const signature = await cryptoApi.subtle.sign(
    "HMAC",
    key,
    encoder.encode(api_key)
  );

  return toHex(new Uint8Array(signature));
}

function randomHex(
  byteLength: number,
  randomBytes: ((byteLength: number) => Uint8Array) | undefined
): string {
  const bytes =
    randomBytes === undefined ? defaultRandomBytes(byteLength) : randomBytes(byteLength);
  if (bytes.length !== byteLength) {
    throw new Error(`randomBytes must return ${byteLength} bytes`);
  }

  return toHex(bytes);
}

function defaultRandomBytes(byteLength: number): Uint8Array {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues === undefined) {
    throw new AuthError(
      "crypto_unavailable",
      "Web Crypto API is required for API-key issuance"
    );
  }

  const bytes = new Uint8Array(byteLength);
  cryptoApi.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    diff |= leftCode ^ rightCode;
  }

  return diff === 0;
}

function getHeader(
  headers: HeaderRecord,
  headerName: string
): string | undefined {
  const target = headerName.toLowerCase();
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() !== target || value === undefined) {
      continue;
    }
    return Array.isArray(value) ? value[0] : value;
  }

  return undefined;
}

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

function normalizePath(path: string): string {
  const [withoutQuery] = path.split("?");
  const withoutTrailingSlash = withoutQuery.replace(/\/+$/, "");
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

function endpointPathMatches(pattern: string, path: string): boolean {
  const patternSegments = normalizePath(pattern).split("/").filter(Boolean);
  const pathSegments = normalizePath(path).split("/").filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    if (segment.startsWith(":")) {
      return pathSegments[index] !== "";
    }

    return segment === pathSegments[index];
  });
}
