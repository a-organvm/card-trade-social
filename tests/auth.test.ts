import {
  authorizeEndpoint,
  createAuthConfig,
  createAuthConfigFromEnv,
  extractApiKeyFromHeaders,
  findEndpointAuthRule,
  issueApiKey,
  requireApiKey,
  verifyApiKey,
} from "../src/auth";
import type { ApiKeyCredential, AuthenticatedUser } from "../src/auth";

const config = createAuthConfig({
  api_key_secret: "test-secret-with-at-least-thirty-two-chars",
});

function fixedRandomBytes(byteLength: number): Uint8Array {
  return Uint8Array.from({ length: byteLength }, (_, index) => index + 1);
}

function tamper(api_key: string): string {
  return `${api_key.slice(0, -1)}${api_key.endsWith("0") ? "1" : "0"}`;
}

describe("API-key issuance and verification", () => {
  it("should issue an API key while storing only a hash credential", async () => {
    const { api_key, credential } = await issueApiKey({
      user_id: "user-1",
      config,
      key_id: "key-0001",
      scopes: ["portfolio:read", "portfolio:write"],
      name: "local dev key",
      randomBytes: fixedRandomBytes,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(api_key).toMatch(/^hka_key-0001_[a-f0-9]{64}$/);
    expect(credential).toMatchObject({
      key_id: "key-0001",
      user_id: "user-1",
      scopes: ["portfolio:read", "portfolio:write"],
      status: "active",
      name: "local dev key",
      key_last4: api_key.slice(-4),
    });
    expect(credential.key_hash).not.toContain(api_key);
    expect(credential.key_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should verify a valid key from a credential store", async () => {
    const { api_key, credential } = await issueApiKey({
      user_id: "user-1",
      config,
      key_id: "key-0002",
      scopes: ["portfolio:read", "portfolio:write"],
      randomBytes: fixedRandomBytes,
    });

    const result = await verifyApiKey(
      api_key,
      new Map([[credential.key_id, credential]]),
      config,
      { required_scopes: ["portfolio:write"] }
    );

    expect(result.valid).toBe(true);
    expect(result.auth).toMatchObject({
      key_id: "key-0002",
      user_id: "user-1",
      scopes: ["portfolio:read", "portfolio:write"],
    });
  });

  it("should reject tampered, expired, revoked, and under-scoped keys", async () => {
    const { api_key, credential } = await issueApiKey({
      user_id: "user-1",
      config,
      key_id: "key-0003",
      scopes: ["portfolio:read"],
      expires_at: new Date("2099-01-02T00:00:00Z"),
      randomBytes: fixedRandomBytes,
    });
    const credentials = { [credential.key_id]: credential };

    await expect(
      verifyApiKey(tamper(api_key), credentials, config)
    ).resolves.toMatchObject({
      valid: false,
      error: "invalid_api_key",
    });

    await expect(
      verifyApiKey(api_key, credentials, config, {
        now: new Date("2100-01-03T00:00:00Z"),
      })
    ).resolves.toMatchObject({
      valid: false,
      error: "expired_api_key",
    });

    await expect(
      verifyApiKey(api_key, credentials, config, {
        required_scopes: ["portfolio:write"],
      })
    ).resolves.toMatchObject({
      valid: false,
      error: "missing_scope",
    });

    const revoked: ApiKeyCredential = { ...credential, status: "revoked" };
    await expect(
      verifyApiKey(api_key, { [revoked.key_id]: revoked }, config)
    ).resolves.toMatchObject({
      valid: false,
      error: "revoked_api_key",
    });
  });

  it("should throw for invalid auth config and unknown scopes", async () => {
    expect(() => createAuthConfigFromEnv({})).toThrow("HYDRA_API_KEY_SECRET");
    expect(() =>
      createAuthConfig({ api_key_secret: "too-short" })
    ).toThrow("at least 32 characters");

    await expect(
      issueApiKey({
        user_id: "user-1",
        config,
        key_id: "key-0004",
        scopes: ["unknown:scope" as never],
        randomBytes: fixedRandomBytes,
      })
    ).rejects.toThrow("Unknown API key scope");
  });
});

describe("endpoint authorization", () => {
  it("should extract API keys from supported headers", () => {
    expect(
      extractApiKeyFromHeaders({ Authorization: "Bearer hka_key_token" })
    ).toBe("hka_key_token");
    expect(
      extractApiKeyFromHeaders({ "x-hydra-api-key": "hka_key_token" })
    ).toBe("hka_key_token");
    expect(extractApiKeyFromHeaders({ authorization: "Basic abc" })).toBeUndefined();
  });

  it("should match primary endpoint auth rules", () => {
    expect(
      findEndpointAuthRule("GET", "/api/v1/cards/card-1/price?currency=usd")
    ).toMatchObject({
      scope: "pricing:read",
    });
    expect(findEndpointAuthRule("WS", "/ws/prices")).toMatchObject({
      scope: "pricing:read",
    });
    expect(findEndpointAuthRule("POST", "/api/v1/unknown")).toBeUndefined();
  });

  it("should authorize a documented endpoint with the required scope", async () => {
    const { api_key, credential } = await issueApiKey({
      user_id: "user-1",
      config,
      key_id: "key-0005",
      scopes: ["pricing:read"],
      randomBytes: fixedRandomBytes,
    });

    await expect(
      authorizeEndpoint({
        method: "GET",
        path: "/api/v1/cards/card-1/price?currency=usd",
        headers: { authorization: `Bearer ${api_key}` },
        credentials: [credential],
        config,
      })
    ).resolves.toMatchObject({
      required_scope: "pricing:read",
      auth: {
        user_id: "user-1",
      },
    });
  });

  it("should reject under-scoped or unknown endpoint requests", async () => {
    const { api_key, credential } = await issueApiKey({
      user_id: "user-1",
      config,
      key_id: "key-0006",
      scopes: ["portfolio:read"],
      randomBytes: fixedRandomBytes,
    });

    await expect(
      authorizeEndpoint({
        method: "POST",
        path: "/api/v1/portfolio/holdings",
        api_key,
        credentials: [credential],
        config,
      })
    ).rejects.toMatchObject({
      code: "missing_scope",
    });

    await expect(
      authorizeEndpoint({
        method: "GET",
        path: "/api/v1/not-real",
        api_key,
        credentials: [credential],
        config,
      })
    ).rejects.toMatchObject({
      code: "unknown_endpoint",
    });
  });
});

describe("requireApiKey", () => {
  it("should throw an AuthError for a missing key", async () => {
    await expect(
      requireApiKey(undefined, {}, config)
    ).rejects.toMatchObject({
      code: "missing_api_key",
    });
  });

  it("should return authenticated user context", async () => {
    const { api_key, credential } = await issueApiKey({
      user_id: "user-1",
      config,
      key_id: "key-0007",
      scopes: ["cards:read"],
      randomBytes: fixedRandomBytes,
    });

    const result = await requireApiKey(api_key, [credential], config);
    const auth: AuthenticatedUser = result.auth;

    expect(auth.user_id).toBe("user-1");
    expect(auth.scopes).toEqual(["cards:read"]);
  });
});
