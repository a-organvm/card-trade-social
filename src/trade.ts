/**
 * Trade proposal engine for the Hydra TCG Platform.
 * Handles offer/accept/reject/counter/history workflows.
 */

import type { Card } from "./card";

export type TradeStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "countered"
  | "cancelled"
  | "expired";

export interface TradeItem {
  card: Card;
  quantity: number;
}

export interface TradeProposal {
  trade_id: string;
  proposer_id: string;
  receiver_id: string;
  offered_items: TradeItem[];
  requested_items: TradeItem[];
  cash_adjustment: number;
  status: TradeStatus;
  message?: string;
  parent_trade_id?: string;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface TradeHistory {
  trades: TradeProposal[];
}

const DEFAULT_EXPIRY_HOURS = 72;

/**
 * Create a new trade proposal.
 */
export function createProposal(params: {
  trade_id: string;
  proposer_id: string;
  receiver_id: string;
  offered_items: TradeItem[];
  requested_items: TradeItem[];
  cash_adjustment?: number;
  message?: string;
  expiry_hours?: number;
}): TradeProposal {
  if (params.proposer_id === params.receiver_id) {
    throw new Error("Cannot trade with yourself");
  }

  if (params.offered_items.length === 0 && params.requested_items.length === 0) {
    throw new Error("Trade must include at least one item");
  }

  for (const item of [...params.offered_items, ...params.requested_items]) {
    if (item.quantity <= 0) {
      throw new Error("Item quantity must be positive");
    }
  }

  const now = new Date();
  const hours = params.expiry_hours ?? DEFAULT_EXPIRY_HOURS;
  const expires_at = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return {
    trade_id: params.trade_id,
    proposer_id: params.proposer_id,
    receiver_id: params.receiver_id,
    offered_items: params.offered_items,
    requested_items: params.requested_items,
    cash_adjustment: params.cash_adjustment ?? 0,
    status: "pending",
    message: params.message,
    created_at: now,
    updated_at: now,
    expires_at,
  };
}

/**
 * Accept a trade proposal. Only the receiver can accept.
 */
export function acceptTrade(trade: TradeProposal, actor_id: string): TradeProposal {
  if (trade.status !== "pending") {
    throw new Error(`Cannot accept trade with status "${trade.status}"`);
  }
  if (actor_id !== trade.receiver_id) {
    throw new Error("Only the receiver can accept a trade");
  }

  return {
    ...trade,
    status: "accepted",
    updated_at: new Date(),
  };
}

/**
 * Reject a trade proposal. Only the receiver can reject.
 */
export function rejectTrade(trade: TradeProposal, actor_id: string): TradeProposal {
  if (trade.status !== "pending") {
    throw new Error(`Cannot reject trade with status "${trade.status}"`);
  }
  if (actor_id !== trade.receiver_id) {
    throw new Error("Only the receiver can reject a trade");
  }

  return {
    ...trade,
    status: "rejected",
    updated_at: new Date(),
  };
}

/**
 * Cancel a trade proposal. Only the proposer can cancel.
 */
export function cancelTrade(trade: TradeProposal, actor_id: string): TradeProposal {
  if (trade.status !== "pending") {
    throw new Error(`Cannot cancel trade with status "${trade.status}"`);
  }
  if (actor_id !== trade.proposer_id) {
    throw new Error("Only the proposer can cancel a trade");
  }

  return {
    ...trade,
    status: "cancelled",
    updated_at: new Date(),
  };
}

/**
 * Counter a trade by creating a new proposal linked to the original.
 */
export function counterTrade(params: {
  new_trade_id: string;
  original: TradeProposal;
  actor_id: string;
  offered_items: TradeItem[];
  requested_items: TradeItem[];
  cash_adjustment?: number;
  message?: string;
}): { original: TradeProposal; counter: TradeProposal } {
  if (params.original.status !== "pending") {
    throw new Error(`Cannot counter trade with status "${params.original.status}"`);
  }
  if (params.actor_id !== params.original.receiver_id) {
    throw new Error("Only the receiver can counter a trade");
  }

  const updated_original: TradeProposal = {
    ...params.original,
    status: "countered",
    updated_at: new Date(),
  };

  const counter = createProposal({
    trade_id: params.new_trade_id,
    proposer_id: params.actor_id,
    receiver_id: params.original.proposer_id,
    offered_items: params.offered_items,
    requested_items: params.requested_items,
    cash_adjustment: params.cash_adjustment,
    message: params.message,
  });
  counter.parent_trade_id = params.original.trade_id;

  return { original: updated_original, counter };
}

/**
 * Check if a trade has expired.
 */
export function isExpired(trade: TradeProposal): boolean {
  return trade.status === "pending" && new Date() > trade.expires_at;
}

/**
 * Calculate the net cash value of a trade from the proposer's perspective.
 * Positive = proposer pays, Negative = proposer receives.
 */
export function netTradeValue(
  trade: TradeProposal,
  priceResolver: (card: Card) => number
): number {
  const offeredValue = trade.offered_items.reduce(
    (sum, item) => sum + priceResolver(item.card) * item.quantity,
    0
  );
  const requestedValue = trade.requested_items.reduce(
    (sum, item) => sum + priceResolver(item.card) * item.quantity,
    0
  );

  return Math.round((requestedValue - offeredValue + trade.cash_adjustment) * 100) / 100;
}

/**
 * Create a trade history tracker.
 */
export function createHistory(): TradeHistory {
  return { trades: [] };
}

/**
 * Add a trade to history.
 */
export function addToHistory(history: TradeHistory, trade: TradeProposal): TradeHistory {
  history.trades.push(trade);
  return history;
}

/**
 * Get trades for a user (as proposer or receiver).
 */
export function getUserTrades(history: TradeHistory, user_id: string): TradeProposal[] {
  return history.trades.filter(
    (t) => t.proposer_id === user_id || t.receiver_id === user_id
  );
}
