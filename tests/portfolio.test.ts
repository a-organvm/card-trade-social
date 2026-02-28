import {
  createPortfolio,
  addCard,
  removeCard,
  portfolioValue,
  getAllocations,
  getStats,
  searchCards,
  filterByRarity,
} from "../src/portfolio";
import { createCard } from "../src/card";
import type { Card, CardVariant } from "../src/card";

function makeCard(overrides: Partial<Parameters<typeof createCard>[0]> = {}): Card {
  return createCard({
    card_id: overrides.card_id ?? "c1",
    name: overrides.name ?? "Test Card",
    game: overrides.game ?? "mtg",
    set_code: overrides.set_code ?? "TST",
    set_name: overrides.set_name ?? "Test Set",
    rarity: overrides.rarity ?? "rare",
    condition: overrides.condition ?? "near_mint",
    variants: overrides.variants ?? [
      { variant_id: "v1", label: "Standard", finish: "standard" as const, market_price: 100 },
    ],
    ...overrides,
  });
}

describe("createPortfolio", () => {
  it("should create an empty portfolio", () => {
    const p = createPortfolio("user-1");
    expect(p.owner_id).toBe("user-1");
    expect(p.entries.size).toBe(0);
  });
});

describe("addCard", () => {
  it("should add a card to the portfolio", () => {
    const p = createPortfolio("user-1");
    const card = makeCard();
    addCard(p, card, 1);
    expect(p.entries.size).toBe(1);
    expect(p.entries.get("c1")?.quantity).toBe(1);
  });

  it("should increment quantity for existing card", () => {
    const p = createPortfolio("user-1");
    const card = makeCard();
    addCard(p, card, 2);
    addCard(p, card, 3);
    expect(p.entries.get("c1")?.quantity).toBe(5);
  });

  it("should throw for non-positive quantity", () => {
    const p = createPortfolio("user-1");
    expect(() => addCard(p, makeCard(), 0)).toThrow("Quantity must be positive");
  });
});

describe("removeCard", () => {
  it("should reduce quantity", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard(), 3);
    removeCard(p, "c1", 1);
    expect(p.entries.get("c1")?.quantity).toBe(2);
  });

  it("should remove entry when quantity reaches zero", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard(), 2);
    removeCard(p, "c1", 2);
    expect(p.entries.size).toBe(0);
  });

  it("should remove entry when quantity exceeds current", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard(), 1);
    removeCard(p, "c1", 5);
    expect(p.entries.size).toBe(0);
  });

  it("should throw for unknown card", () => {
    const p = createPortfolio("user-1");
    expect(() => removeCard(p, "unknown")).toThrow("not found in portfolio");
  });

  it("should throw for non-positive quantity", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard(), 1);
    expect(() => removeCard(p, "c1", -1)).toThrow("Quantity must be positive");
  });
});

describe("portfolioValue", () => {
  it("should return 0 for empty portfolio", () => {
    expect(portfolioValue(createPortfolio("u"))).toBe(0);
  });

  it("should calculate value with condition adjustment", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard({ condition: "near_mint" }), 2);
    // Base price 100 * 0.9 (near_mint) * 2 = 180
    expect(portfolioValue(p)).toBe(180);
  });
});

describe("getAllocations", () => {
  it("should break down by game", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard({ card_id: "c1", game: "mtg" }), 1);
    addCard(
      p,
      makeCard({
        card_id: "c2",
        game: "pokemon",
        variants: [
          { variant_id: "v1", label: "Standard", finish: "standard" as const, market_price: 200 },
        ],
      }),
      1
    );

    const allocs = getAllocations(p);
    expect(allocs).toHaveLength(2);
    expect(allocs[0].game).toBe("pokemon"); // Higher value first
  });
});

describe("getStats", () => {
  it("should return correct stats", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard(), 3);
    const stats = getStats(p);
    expect(stats.total_cards).toBe(3);
    expect(stats.total_value).toBeGreaterThan(0);
    expect(stats.allocations).toHaveLength(1);
  });
});

describe("searchCards", () => {
  it("should find cards by name substring", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard({ card_id: "c1", name: "Black Lotus" }), 1);
    addCard(p, makeCard({ card_id: "c2", name: "Sol Ring" }), 1);
    addCard(p, makeCard({ card_id: "c3", name: "Black Vise" }), 1);

    const results = searchCards(p, "black");
    expect(results).toHaveLength(2);
  });

  it("should return empty for no match", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard(), 1);
    expect(searchCards(p, "nonexistent")).toHaveLength(0);
  });
});

describe("filterByRarity", () => {
  it("should filter by rarity", () => {
    const p = createPortfolio("user-1");
    addCard(p, makeCard({ card_id: "c1", rarity: "rare" }), 1);
    addCard(p, makeCard({ card_id: "c2", rarity: "common" }), 1);
    addCard(p, makeCard({ card_id: "c3", rarity: "rare" }), 1);

    expect(filterByRarity(p, "rare")).toHaveLength(2);
    expect(filterByRarity(p, "common")).toHaveLength(1);
    expect(filterByRarity(p, "mythic")).toHaveLength(0);
  });
});
