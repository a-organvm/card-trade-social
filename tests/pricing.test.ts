import {
  createPriceHistory,
  recordPrice,
  calculateHydraPrice,
  getRecentPoints,
  filterOutliers,
  detectArbitrage,
  calculatePriceChanges,
} from "../src/pricing";
import type { PriceHistory, PricePoint } from "../src/pricing";

describe("createPriceHistory", () => {
  it("should create empty price history", () => {
    const h = createPriceHistory("c1");
    expect(h.card_id).toBe("c1");
    expect(h.points).toHaveLength(0);
  });
});

describe("recordPrice", () => {
  it("should add a price point", () => {
    const h = createPriceHistory("c1");
    recordPrice(h, "tcgplayer", 100, true);
    expect(h.points).toHaveLength(1);
    expect(h.points[0].source).toBe("tcgplayer");
    expect(h.points[0].is_sold).toBe(true);
  });

  it("should reject negative prices", () => {
    const h = createPriceHistory("c1");
    expect(() => recordPrice(h, "ebay", -5, false)).toThrow("cannot be negative");
  });
});

describe("calculateHydraPrice", () => {
  it("should return 0 for empty history", () => {
    const h = createPriceHistory("c1");
    const result = calculateHydraPrice(h);
    expect(result.price).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it("should weight sold listings higher than active", () => {
    const h = createPriceHistory("c1");
    // 2 sold at $100, 1 listed at $200
    recordPrice(h, "tcgplayer", 100, true);
    recordPrice(h, "tcgplayer", 100, true);
    recordPrice(h, "ebay", 200, false);

    const result = calculateHydraPrice(h);
    // Weighted: (100*2 + 100*2 + 200*1) / (2+2+1) = 600/5 = 120
    expect(result.price).toBe(120);
    expect(result.sources_used).toBe(2);
  });

  it("should have higher confidence with more data points and sources", () => {
    const h = createPriceHistory("c1");
    for (let i = 0; i < 10; i++) {
      recordPrice(h, "tcgplayer", 100, true);
    }
    for (let i = 0; i < 10; i++) {
      recordPrice(h, "ebay", 105, true);
    }

    const result = calculateHydraPrice(h);
    expect(result.confidence).toBe(1);
  });
});

describe("getRecentPoints", () => {
  it("should filter by recency", () => {
    const h = createPriceHistory("c1");
    // Add an old point
    const oldPoint: PricePoint = {
      source: "tcgplayer",
      price: 50,
      is_sold: true,
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    };
    h.points.push(oldPoint);
    recordPrice(h, "tcgplayer", 100, true); // recent

    expect(getRecentPoints(h, 30)).toHaveLength(1);
    expect(getRecentPoints(h, 90)).toHaveLength(2);
  });
});

describe("filterOutliers", () => {
  it("should return all points if fewer than 4", () => {
    const points: PricePoint[] = [
      { source: "tcgplayer", price: 100, is_sold: true, timestamp: new Date() },
      { source: "ebay", price: 1000, is_sold: true, timestamp: new Date() },
    ];
    expect(filterOutliers(points)).toHaveLength(2);
  });

  it("should remove extreme outliers", () => {
    const now = new Date();
    const points: PricePoint[] = [
      { source: "tcgplayer", price: 98, is_sold: true, timestamp: now },
      { source: "tcgplayer", price: 100, is_sold: true, timestamp: now },
      { source: "ebay", price: 102, is_sold: true, timestamp: now },
      { source: "ebay", price: 99, is_sold: true, timestamp: now },
      { source: "cardkingdom", price: 101, is_sold: true, timestamp: now },
      { source: "ebay", price: 5000, is_sold: false, timestamp: now }, // outlier
    ];

    const filtered = filterOutliers(points);
    expect(filtered.length).toBeLessThan(points.length);
    expect(filtered.every((p) => p.price < 5000)).toBe(true);
  });
});

describe("detectArbitrage", () => {
  it("should detect price discrepancies between sources", () => {
    const h = createPriceHistory("c1");
    const now = new Date();
    h.points.push(
      { source: "tcgplayer", price: 20, is_sold: true, timestamp: now },
      { source: "tcgplayer", price: 22, is_sold: true, timestamp: now },
      { source: "ebay", price: 35, is_sold: true, timestamp: now },
      { source: "ebay", price: 37, is_sold: true, timestamp: now }
    );

    const alerts = detectArbitrage([
      { card_id: "c1", card_name: "Test Card", history: h },
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].low_source).toBe("tcgplayer");
    expect(alerts[0].high_source).toBe("ebay");
    expect(alerts[0].spread_percentage).toBeGreaterThan(15);
  });

  it("should return empty for small spreads", () => {
    const h = createPriceHistory("c1");
    const now = new Date();
    h.points.push(
      { source: "tcgplayer", price: 100, is_sold: true, timestamp: now },
      { source: "ebay", price: 102, is_sold: true, timestamp: now }
    );

    const alerts = detectArbitrage([
      { card_id: "c1", card_name: "Test Card", history: h },
    ]);

    expect(alerts).toHaveLength(0);
  });
});

describe("calculatePriceChanges", () => {
  it("should calculate price changes between periods", () => {
    const h = createPriceHistory("c1");
    const now = Date.now();

    // Old points (3 days ago)
    h.points.push({
      source: "tcgplayer",
      price: 100,
      is_sold: true,
      timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000),
    });

    // Recent points (now)
    h.points.push({
      source: "tcgplayer",
      price: 120,
      is_sold: true,
      timestamp: new Date(now),
    });

    const changes = calculatePriceChanges(
      [{ card_id: "c1", card_name: "Test Card", history: h }],
      7,
      1
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].change).toBe(20);
    expect(changes[0].change_percentage).toBe(20);
  });
});
