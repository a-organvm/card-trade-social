/**
 * Card entity and related types for the Hydra TCG Platform.
 * Represents a trading card as a financial asset with pricing and grading.
 */

export type Rarity = "common" | "uncommon" | "rare" | "mythic" | "secret";

export type Condition =
  | "mint"
  | "near_mint"
  | "lightly_played"
  | "moderately_played"
  | "heavily_played"
  | "damaged";

export type CardGame = "mtg" | "pokemon" | "yugioh" | "lorcana" | "other";

export interface CardVariant {
  variant_id: string;
  label: string;
  finish: "standard" | "foil" | "etched" | "borderless" | "serialized";
  market_price: number;
  listed_price?: number;
}

export interface Card {
  card_id: string;
  name: string;
  game: CardGame;
  set_code: string;
  set_name: string;
  rarity: Rarity;
  condition: Condition;
  collector_number?: string;
  ticker: string;
  variants: CardVariant[];
  image_uri?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Generate a ticker symbol for a card. Format: GAME-SET-NAME
 * e.g., MTG-BLK-LOTUS
 */
export function generateTicker(game: CardGame, set_code: string, name: string): string {
  const sanitized = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return `${game.toUpperCase()}-${set_code.toUpperCase()}-${sanitized}`;
}

/**
 * Condition multiplier for pricing. Mint = 1.0, progressively lower.
 */
const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  mint: 1.0,
  near_mint: 0.9,
  lightly_played: 0.75,
  moderately_played: 0.6,
  heavily_played: 0.4,
  damaged: 0.25,
};

export function getConditionMultiplier(condition: Condition): number {
  return CONDITION_MULTIPLIERS[condition];
}

/**
 * Calculate adjusted market price based on condition.
 */
export function adjustedPrice(basePrice: number, condition: Condition): number {
  return Math.round(basePrice * getConditionMultiplier(condition) * 100) / 100;
}

/**
 * Create a new Card entity.
 */
export function createCard(params: {
  card_id: string;
  name: string;
  game: CardGame;
  set_code: string;
  set_name: string;
  rarity: Rarity;
  condition: Condition;
  collector_number?: string;
  variants?: CardVariant[];
  image_uri?: string;
}): Card {
  const now = new Date();
  return {
    card_id: params.card_id,
    name: params.name,
    game: params.game,
    set_code: params.set_code,
    set_name: params.set_name,
    rarity: params.rarity,
    condition: params.condition,
    collector_number: params.collector_number,
    ticker: generateTicker(params.game, params.set_code, params.name),
    variants: params.variants ?? [],
    image_uri: params.image_uri,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get the best (highest) market price across all variants.
 */
export function bestVariantPrice(card: Card): number {
  if (card.variants.length === 0) return 0;
  return Math.max(...card.variants.map((v) => v.market_price));
}

/**
 * Find a variant by label (case-insensitive).
 */
export function findVariant(card: Card, label: string): CardVariant | undefined {
  const lower = label.toLowerCase();
  return card.variants.find((v) => v.label.toLowerCase() === lower);
}
