/**
 * Authenticated wrappers for implemented primary operations.
 *
 * HTTP handlers and CLI commands should authenticate an API key first, then
 * call these wrappers so scope and user checks stay close to domain behavior.
 */

import type { AuthenticatedUser } from "./auth";
import { requireScope, requireUser } from "./auth";
import type { Card, Rarity } from "./card";
import type {
  Portfolio,
  PortfolioEntry,
  PortfolioStats,
} from "./portfolio";
import {
  addCard,
  filterByRarity,
  getStats,
  removeCard,
  searchCards,
} from "./portfolio";
import type {
  ArbitrageAlert,
  GatedArbitrageAlerts,
  GatedArbitrageOptions,
  HydraPrice,
  PriceHistory,
  PriceSource,
} from "./pricing";
import {
  calculateHydraPrice,
  detectArbitrage,
  detectArbitrageWithGate,
  recordPrice,
} from "./pricing";
import type {
  BillingCheckoutSessionParams,
  EntitlementSubject,
  InAppPurchaseBillingCheckoutParams,
  InAppPurchaseCheckoutParams,
  ProBillingCheckoutParams,
  ProCheckoutParams,
  StripeCheckoutSessionParams,
} from "./subscription";
import {
  createInAppPurchaseBillingCheckoutSession,
  createInAppPurchaseCheckoutSession,
  createProBillingCheckoutSession,
  createProCheckoutSession,
} from "./subscription";
import type {
  TradeHistory,
  TradeProposal,
} from "./trade";
import {
  acceptTrade,
  cancelTrade,
  counterTrade,
  createProposal,
  getUserTrades,
  rejectTrade,
} from "./trade";

type CreateProposalParams = Parameters<typeof createProposal>[0];
type CounterTradeParams = Parameters<typeof counterTrade>[0];

export type AuthenticatedCreateProposalParams = Omit<
  CreateProposalParams,
  "proposer_id"
> & {
  proposer_id?: string;
};

export type AuthenticatedCounterTradeParams = Omit<
  CounterTradeParams,
  "actor_id"
> & {
  actor_id?: string;
};

export type AuthenticatedProCheckoutParams = Omit<
  ProCheckoutParams,
  "user_id"
> & {
  user_id?: string;
};

export type AuthenticatedInAppPurchaseCheckoutParams = Omit<
  InAppPurchaseCheckoutParams,
  "user_id"
> & {
  user_id?: string;
};

export type AuthenticatedProBillingCheckoutParams = Omit<
  ProBillingCheckoutParams,
  "user_id"
> & {
  user_id?: string;
};

export type AuthenticatedInAppPurchaseBillingCheckoutParams = Omit<
  InAppPurchaseBillingCheckoutParams,
  "user_id"
> & {
  user_id?: string;
};

export function getAuthenticatedPortfolioStats(
  auth: AuthenticatedUser,
  portfolio: Portfolio
): PortfolioStats {
  requireScope(auth, "portfolio:read");
  requireUser(auth, portfolio.owner_id, "portfolio");
  return getStats(portfolio);
}

export function addAuthenticatedPortfolioCard(
  auth: AuthenticatedUser,
  portfolio: Portfolio,
  card: Card,
  quantity: number = 1,
  purchase_price?: number
): Portfolio {
  requireScope(auth, "portfolio:write");
  requireUser(auth, portfolio.owner_id, "portfolio");
  return addCard(portfolio, card, quantity, purchase_price);
}

export function removeAuthenticatedPortfolioCard(
  auth: AuthenticatedUser,
  portfolio: Portfolio,
  card_id: string,
  quantity: number = 1
): Portfolio {
  requireScope(auth, "portfolio:write");
  requireUser(auth, portfolio.owner_id, "portfolio");
  return removeCard(portfolio, card_id, quantity);
}

export function searchAuthenticatedPortfolioCards(
  auth: AuthenticatedUser,
  portfolio: Portfolio,
  query: string
): PortfolioEntry[] {
  requireScope(auth, "portfolio:read");
  requireUser(auth, portfolio.owner_id, "portfolio");
  return searchCards(portfolio, query);
}

export function filterAuthenticatedPortfolioByRarity(
  auth: AuthenticatedUser,
  portfolio: Portfolio,
  rarity: Rarity
): PortfolioEntry[] {
  requireScope(auth, "portfolio:read");
  requireUser(auth, portfolio.owner_id, "portfolio");
  return filterByRarity(portfolio, rarity);
}

export function createAuthenticatedProposal(
  auth: AuthenticatedUser,
  params: AuthenticatedCreateProposalParams
): TradeProposal {
  requireScope(auth, "trades:write");
  const proposer_id = params.proposer_id ?? auth.user_id;
  requireUser(auth, proposer_id, "trade proposal");
  return createProposal({
    ...params,
    proposer_id,
  });
}

export function acceptAuthenticatedTrade(
  auth: AuthenticatedUser,
  trade: TradeProposal
): TradeProposal {
  requireScope(auth, "trades:write");
  requireUser(auth, trade.receiver_id, "trade receiver");
  return acceptTrade(trade, auth.user_id);
}

export function rejectAuthenticatedTrade(
  auth: AuthenticatedUser,
  trade: TradeProposal
): TradeProposal {
  requireScope(auth, "trades:write");
  requireUser(auth, trade.receiver_id, "trade receiver");
  return rejectTrade(trade, auth.user_id);
}

export function cancelAuthenticatedTrade(
  auth: AuthenticatedUser,
  trade: TradeProposal
): TradeProposal {
  requireScope(auth, "trades:write");
  requireUser(auth, trade.proposer_id, "trade proposer");
  return cancelTrade(trade, auth.user_id);
}

export function counterAuthenticatedTrade(
  auth: AuthenticatedUser,
  params: AuthenticatedCounterTradeParams
): ReturnType<typeof counterTrade> {
  requireScope(auth, "trades:write");
  const actor_id = params.actor_id ?? auth.user_id;
  requireUser(auth, actor_id, "trade counter");
  return counterTrade({
    ...params,
    actor_id,
  });
}

export function getAuthenticatedUserTrades(
  auth: AuthenticatedUser,
  history: TradeHistory,
  user_id: string = auth.user_id
): TradeProposal[] {
  requireScope(auth, "trades:read");
  requireUser(auth, user_id, "trade history");
  return getUserTrades(history, user_id);
}

export function getAuthenticatedHydraPrice(
  auth: AuthenticatedUser,
  history: PriceHistory
): HydraPrice {
  requireScope(auth, "pricing:read");
  return calculateHydraPrice(history);
}

export function recordAuthenticatedPrice(
  auth: AuthenticatedUser,
  history: PriceHistory,
  source: PriceSource,
  price: number,
  is_sold: boolean
): PriceHistory {
  requireScope(auth, "pricing:write");
  return recordPrice(history, source, price, is_sold);
}

export function detectAuthenticatedArbitrage(
  auth: AuthenticatedUser,
  histories: { card_id: string; card_name: string; history: PriceHistory }[],
  minSpreadPercentage: number = 15
): ArbitrageAlert[] {
  requireScope(auth, "pricing:read");
  return detectArbitrage(histories, minSpreadPercentage);
}

export function detectAuthenticatedArbitrageWithGate(
  auth: AuthenticatedUser,
  histories: { card_id: string; card_name: string; history: PriceHistory }[],
  subscription: EntitlementSubject,
  options: GatedArbitrageOptions = {}
): GatedArbitrageAlerts {
  requireScope(auth, "pricing:read");
  requireUser(auth, subscription.user_id, "subscription");
  return detectArbitrageWithGate(histories, subscription, options);
}

export function createAuthenticatedProCheckoutSession(
  auth: AuthenticatedUser,
  params: AuthenticatedProCheckoutParams
): StripeCheckoutSessionParams {
  requireScope(auth, "billing:write");
  const user_id = resolveAuthenticatedUserId(auth, params.user_id, "checkout");
  return createProCheckoutSession({
    ...params,
    user_id,
  });
}

export function createAuthenticatedInAppPurchaseCheckoutSession(
  auth: AuthenticatedUser,
  params: AuthenticatedInAppPurchaseCheckoutParams
): StripeCheckoutSessionParams {
  requireScope(auth, "billing:write");
  const user_id = resolveAuthenticatedUserId(auth, params.user_id, "checkout");
  return createInAppPurchaseCheckoutSession({
    ...params,
    user_id,
  });
}

export function createAuthenticatedProBillingCheckoutSession(
  auth: AuthenticatedUser,
  params: AuthenticatedProBillingCheckoutParams
): BillingCheckoutSessionParams {
  requireScope(auth, "billing:write");
  const user_id = resolveAuthenticatedUserId(auth, params.user_id, "checkout");
  return createProBillingCheckoutSession({
    ...params,
    user_id,
  } as ProBillingCheckoutParams);
}

export function createAuthenticatedInAppPurchaseBillingCheckoutSession(
  auth: AuthenticatedUser,
  params: AuthenticatedInAppPurchaseBillingCheckoutParams
): BillingCheckoutSessionParams {
  requireScope(auth, "billing:write");
  const user_id = resolveAuthenticatedUserId(auth, params.user_id, "checkout");
  return createInAppPurchaseBillingCheckoutSession({
    ...params,
    user_id,
  } as InAppPurchaseBillingCheckoutParams);
}

function resolveAuthenticatedUserId(
  auth: AuthenticatedUser,
  user_id: string | undefined,
  resource: string
): string {
  const resolvedUserId = user_id ?? auth.user_id;
  requireUser(auth, resolvedUserId, resource);
  return resolvedUserId;
}
