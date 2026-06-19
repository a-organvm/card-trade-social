/**
 * Subscription and checkout scaffolding for Hydra Pro and in-app purchases.
 *
 * This module intentionally avoids importing the Stripe SDK. API routes can pass
 * the returned params directly to `stripe.checkout.sessions.create(...)`.
 */

export type SubscriptionTier = "free" | "pro";

export type SubscriptionStatus =
  | "none"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type BillingInterval = "month" | "year";

export type Entitlement =
  | "portfolio.analytics.basic"
  | "portfolio.analytics.advanced"
  | "portfolio.catalog.basic"
  | "portfolio.catalog.unlimited"
  | "portfolio.catalog.bulk_import"
  | "portfolio.alerts.unlimited";

export type InAppProductId =
  | "proxy_print_credit"
  | "avatar_skin"
  | "guild_banner";

export interface SubscriptionState {
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  updated_at: Date;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  entitlements: Entitlement[];
}

export interface CatalogingLimits {
  max_cards: number;
  bulk_import: boolean;
  scan_to_catalog: boolean;
}

export interface InAppProduct {
  product_id: InAppProductId;
  name: string;
  kind: "consumable" | "durable";
  price_cents: number;
  currency: "usd";
  description: string;
}

export interface StripeCheckoutLineItem {
  price: string;
  quantity: number;
}

export interface StripeCheckoutSessionParams {
  mode: "subscription" | "payment";
  line_items: StripeCheckoutLineItem[];
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  customer?: string;
  customer_email?: string;
  allow_promotion_codes?: boolean;
  metadata: Record<string, string>;
  subscription_data?: {
    metadata: Record<string, string>;
  };
  payment_intent_data?: {
    metadata: Record<string, string>;
  };
}

export interface StripeCheckoutSessionSnapshot {
  id: string;
  mode: "subscription" | "payment";
  client_reference_id?: string;
  customer?: string;
  payment_intent?: string;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  amount_total?: number;
  currency?: string;
  metadata?: Record<string, string | undefined>;
}

export interface InAppPurchaseReceipt {
  user_id: string;
  product_id: InAppProductId;
  quantity: number;
  stripe_checkout_session_id: string;
  stripe_customer_id?: string;
  stripe_payment_intent_id?: string;
  amount_total?: number;
  currency?: string;
  purchased_at: Date;
}

export interface ProCheckoutParams {
  user_id: string;
  price_id: string;
  billing_interval: BillingInterval;
  success_url: string;
  cancel_url: string;
  stripe_customer_id?: string;
  customer_email?: string;
}

export interface InAppPurchaseCheckoutParams {
  user_id: string;
  product_id: InAppProductId;
  price_id: string;
  quantity?: number;
  success_url: string;
  cancel_url: string;
  stripe_customer_id?: string;
  customer_email?: string;
}

export interface StripeSubscriptionSnapshot {
  id: string;
  customer: string;
  status: SubscriptionStatus;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  items?: {
    data: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  metadata?: Record<string, string | undefined>;
}

export const FREE_PLAN: SubscriptionPlan = {
  tier: "free",
  name: "Hydra Free",
  monthly_price_cents: 0,
  yearly_price_cents: 0,
  entitlements: ["portfolio.analytics.basic", "portfolio.catalog.basic"],
};

export const PRO_PLAN: SubscriptionPlan = {
  tier: "pro",
  name: "Hydra Pro",
  monthly_price_cents: 999,
  yearly_price_cents: 9900,
  entitlements: [
    "portfolio.analytics.basic",
    "portfolio.analytics.advanced",
    "portfolio.catalog.basic",
    "portfolio.catalog.unlimited",
    "portfolio.catalog.bulk_import",
    "portfolio.alerts.unlimited",
  ],
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: FREE_PLAN,
  pro: PRO_PLAN,
};

export const UNLIMITED_CATALOG_CARDS = Number.MAX_SAFE_INTEGER;

export const CATALOGING_LIMITS: Record<SubscriptionTier, CatalogingLimits> = {
  free: {
    max_cards: 100,
    bulk_import: false,
    scan_to_catalog: true,
  },
  pro: {
    max_cards: UNLIMITED_CATALOG_CARDS,
    bulk_import: true,
    scan_to_catalog: true,
  },
};

export const IN_APP_PRODUCTS: Record<InAppProductId, InAppProduct> = {
  proxy_print_credit: {
    product_id: "proxy_print_credit",
    name: "Proxy Print Credit",
    kind: "consumable",
    price_cents: 199,
    currency: "usd",
    description: "Credit for one generated proxy print order.",
  },
  avatar_skin: {
    product_id: "avatar_skin",
    name: "Avatar Skin",
    kind: "durable",
    price_cents: 499,
    currency: "usd",
    description: "Permanent cosmetic skin for the collection avatar.",
  },
  guild_banner: {
    product_id: "guild_banner",
    name: "Guild Banner",
    kind: "durable",
    price_cents: 699,
    currency: "usd",
    description: "Permanent banner cosmetic for a user-managed guild.",
  },
};

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);

export function createFreeSubscription(user_id: string): SubscriptionState {
  return {
    user_id,
    tier: "free",
    status: "none",
    cancel_at_period_end: false,
    updated_at: new Date(),
  };
}

export function isSubscriptionActive(
  subscription: SubscriptionState,
  now: Date = new Date()
): boolean {
  if (!ACTIVE_STATUSES.has(subscription.status)) {
    return false;
  }

  return (
    subscription.current_period_end === undefined ||
    subscription.current_period_end.getTime() > now.getTime()
  );
}

export function effectiveTier(
  subscription: SubscriptionState,
  now: Date = new Date()
): SubscriptionTier {
  return subscription.tier === "pro" && isSubscriptionActive(subscription, now)
    ? "pro"
    : "free";
}

export function hasEntitlement(
  subscription: SubscriptionState,
  entitlement: Entitlement,
  now: Date = new Date()
): boolean {
  const tier = effectiveTier(subscription, now);
  return SUBSCRIPTION_PLANS[tier].entitlements.includes(entitlement);
}

export function requireEntitlement(
  subscription: SubscriptionState,
  entitlement: Entitlement,
  now: Date = new Date()
): void {
  if (!hasEntitlement(subscription, entitlement, now)) {
    throw new Error(`Hydra Pro is required for ${entitlement}`);
  }
}

export function getCatalogingLimits(
  subscription: SubscriptionState,
  now: Date = new Date()
): CatalogingLimits {
  return CATALOGING_LIMITS[effectiveTier(subscription, now)];
}

export function createProCheckoutSession(
  params: ProCheckoutParams
): StripeCheckoutSessionParams {
  assertNonEmpty(params.user_id, "user_id");
  assertNonEmpty(params.price_id, "price_id");
  assertCheckoutUrl(params.success_url, "success_url");
  assertCheckoutUrl(params.cancel_url, "cancel_url");

  const metadata = {
    user_id: params.user_id,
    product: "hydra_pro",
    tier: "pro",
    billing_interval: params.billing_interval,
  };

  return {
    mode: "subscription",
    line_items: [{ price: params.price_id, quantity: 1 }],
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    client_reference_id: params.user_id,
    customer: params.stripe_customer_id,
    customer_email: params.stripe_customer_id ? undefined : params.customer_email,
    allow_promotion_codes: true,
    metadata,
    subscription_data: { metadata },
  };
}

export function createInAppPurchaseCheckoutSession(
  params: InAppPurchaseCheckoutParams
): StripeCheckoutSessionParams {
  assertNonEmpty(params.user_id, "user_id");
  assertNonEmpty(params.price_id, "price_id");
  assertCheckoutUrl(params.success_url, "success_url");
  assertCheckoutUrl(params.cancel_url, "cancel_url");

  const product = IN_APP_PRODUCTS[params.product_id];
  if (!product) {
    throw new Error(`Unknown in-app product: ${params.product_id}`);
  }

  const quantity = params.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  const metadata = {
    user_id: params.user_id,
    product_id: product.product_id,
    product_kind: product.kind,
    quantity: quantity.toString(),
  };

  return {
    mode: "payment",
    line_items: [{ price: params.price_id, quantity }],
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    client_reference_id: params.user_id,
    customer: params.stripe_customer_id,
    customer_email: params.stripe_customer_id ? undefined : params.customer_email,
    metadata,
    payment_intent_data: { metadata },
  };
}

export function subscriptionFromStripeSnapshot(
  user_id: string,
  snapshot: StripeSubscriptionSnapshot,
  pro_price_ids: string[] = []
): SubscriptionState {
  assertNonEmpty(user_id, "user_id");
  assertNonEmpty(snapshot.id, "stripe_subscription_id");
  assertNonEmpty(snapshot.customer, "stripe_customer_id");

  const price_id = snapshot.items?.data[0]?.price?.id;
  const isProPrice =
    snapshot.metadata?.tier === "pro" ||
    (price_id !== undefined && pro_price_ids.includes(price_id));

  return {
    user_id,
    tier: isProPrice ? "pro" : "free",
    status: snapshot.status,
    stripe_customer_id: snapshot.customer,
    stripe_subscription_id: snapshot.id,
    stripe_price_id: price_id,
    current_period_end:
      snapshot.current_period_end === undefined
        ? undefined
        : new Date(snapshot.current_period_end * 1000),
    cancel_at_period_end: snapshot.cancel_at_period_end ?? false,
    updated_at: new Date(),
  };
}

export function inAppPurchaseReceiptFromCheckoutSession(
  session: StripeCheckoutSessionSnapshot,
  now: Date = new Date()
): InAppPurchaseReceipt {
  assertNonEmpty(session.id, "stripe_checkout_session_id");
  if (session.mode !== "payment") {
    throw new Error(`Expected payment checkout session, received ${session.mode}`);
  }
  if (session.payment_status !== undefined && session.payment_status !== "paid") {
    throw new Error(`Checkout session is not paid: ${session.payment_status}`);
  }

  const user_id = session.metadata?.user_id ?? session.client_reference_id;
  assertNonEmpty(user_id, "user_id");

  const product_id = session.metadata?.product_id;
  if (!isInAppProductId(product_id)) {
    throw new Error(`Unknown in-app product: ${product_id ?? "missing"}`);
  }

  const quantity = Number(session.metadata?.quantity ?? "1");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  return {
    user_id,
    product_id,
    quantity,
    stripe_checkout_session_id: session.id,
    stripe_customer_id: session.customer,
    stripe_payment_intent_id: session.payment_intent,
    amount_total: session.amount_total,
    currency: session.currency,
    purchased_at: now,
  };
}

function assertNonEmpty(value: string | undefined, field: string): asserts value is string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
}

function assertCheckoutUrl(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (!/^https?:\/\//.test(value)) {
    throw new Error(`${field} must be an absolute HTTP URL`);
  }
}

function isInAppProductId(value: string | undefined): value is InAppProductId {
  return value !== undefined && value in IN_APP_PRODUCTS;
}
