/**
 * Portfolio — collection tracking, valuation, and allocation for the Hydra TCG Platform.
 */

import type { Card, CardGame, Rarity } from "./card";
import { bestVariantPrice, adjustedPrice } from "./card";

export interface PortfolioEntry {
  card: Card;
  quantity: number;
  purchase_price?: number;
  added_at: Date;
}

export interface Portfolio {
  owner_id: string;
  entries: Map<string, PortfolioEntry>;
  created_at: Date;
}

export interface AllocationBreakdown {
  game: CardGame;
  value: number;
  percentage: number;
}

export interface PortfolioStats {
  total_cards: number;
  total_value: number;
  daily_pnl?: number;
  allocations: AllocationBreakdown[];
}

/**
 * Create a new empty portfolio.
 */
export function createPortfolio(owner_id: string): Portfolio {
  return {
    owner_id,
    entries: new Map(),
    created_at: new Date(),
  };
}

/**
 * Add a card to the portfolio. If the card already exists, increment quantity.
 */
export function addCard(
  portfolio: Portfolio,
  card: Card,
  quantity: number = 1,
  purchase_price?: number
): Portfolio {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  const existing = portfolio.entries.get(card.card_id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    portfolio.entries.set(card.card_id, {
      card,
      quantity,
      purchase_price,
      added_at: new Date(),
    });
  }

  return portfolio;
}

/**
 * Remove a card (or reduce quantity) from the portfolio.
 */
export function removeCard(
  portfolio: Portfolio,
  card_id: string,
  quantity: number = 1
): Portfolio {
  const entry = portfolio.entries.get(card_id);
  if (!entry) {
    throw new Error(`Card ${card_id} not found in portfolio`);
  }

  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  if (quantity >= entry.quantity) {
    portfolio.entries.delete(card_id);
  } else {
    entry.quantity -= quantity;
  }

  return portfolio;
}

/**
 * Calculate total portfolio value based on best variant prices and condition.
 */
export function portfolioValue(portfolio: Portfolio): number {
  let total = 0;
  for (const entry of portfolio.entries.values()) {
    const base = bestVariantPrice(entry.card);
    const adjusted = adjustedPrice(base, entry.card.condition);
    total += adjusted * entry.quantity;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calculate asset allocation breakdown by game.
 */
export function getAllocations(portfolio: Portfolio): AllocationBreakdown[] {
  const gameValues = new Map<CardGame, number>();

  for (const entry of portfolio.entries.values()) {
    const base = bestVariantPrice(entry.card);
    const adjusted = adjustedPrice(base, entry.card.condition);
    const value = adjusted * entry.quantity;
    const current = gameValues.get(entry.card.game) ?? 0;
    gameValues.set(entry.card.game, current + value);
  }

  const total = portfolioValue(portfolio);
  const allocations: AllocationBreakdown[] = [];

  for (const [game, value] of gameValues.entries()) {
    allocations.push({
      game,
      value: Math.round(value * 100) / 100,
      percentage: total > 0 ? Math.round((value / total) * 10000) / 100 : 0,
    });
  }

  return allocations.sort((a, b) => b.value - a.value);
}

/**
 * Get portfolio statistics.
 */
export function getStats(portfolio: Portfolio): PortfolioStats {
  let total_cards = 0;
  for (const entry of portfolio.entries.values()) {
    total_cards += entry.quantity;
  }

  return {
    total_cards,
    total_value: portfolioValue(portfolio),
    allocations: getAllocations(portfolio),
  };
}

/**
 * Search portfolio entries by card name (case-insensitive substring match).
 */
export function searchCards(portfolio: Portfolio, query: string): PortfolioEntry[] {
  const lower = query.toLowerCase();
  const results: PortfolioEntry[] = [];
  for (const entry of portfolio.entries.values()) {
    if (entry.card.name.toLowerCase().includes(lower)) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * Filter portfolio by rarity.
 */
export function filterByRarity(portfolio: Portfolio, rarity: Rarity): PortfolioEntry[] {
  const results: PortfolioEntry[] = [];
  for (const entry of portfolio.entries.values()) {
    if (entry.card.rarity === rarity) {
      results.push(entry);
    }
  }
  return results;
}
