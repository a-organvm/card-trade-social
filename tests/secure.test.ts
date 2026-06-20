import type { AuthenticatedUser } from "../src/auth";
import { createCard } from "../src/card";
import { createPortfolio } from "../src/portfolio";
import {
  createPriceHistory,
} from "../src/pricing";
import {
  addAuthenticatedPortfolioCard,
  createAuthenticatedProCheckoutSession,
  createAuthenticatedProposal,
  getAuthenticatedPortfolioStats,
  recordAuthenticatedPrice,
} from "../src/secure";

const writeAuth: AuthenticatedUser = {
  key_id: "key-1",
  user_id: "user-1",
  scopes: [
    "portfolio:read",
    "portfolio:write",
    "trades:write",
    "pricing:write",
    "billing:write",
  ],
  authenticated_at: new Date(),
};

const readOnlyAuth: AuthenticatedUser = {
  ...writeAuth,
  scopes: ["portfolio:read"],
};

const card = createCard({
  card_id: "c1",
  name: "Black Lotus",
  game: "mtg",
  set_code: "LEA",
  set_name: "Limited Edition Alpha",
  rarity: "rare",
  condition: "mint",
  variants: [
    {
      variant_id: "v1",
      label: "Standard",
      finish: "standard",
      market_price: 100,
    },
  ],
});

describe("authenticated portfolio operations", () => {
  it("should enforce portfolio scopes and ownership", () => {
    const portfolio = createPortfolio("user-1");

    addAuthenticatedPortfolioCard(writeAuth, portfolio, card, 2);

    expect(getAuthenticatedPortfolioStats(readOnlyAuth, portfolio)).toMatchObject({
      total_cards: 2,
      total_value: 200,
    });

    expect(() =>
      addAuthenticatedPortfolioCard(readOnlyAuth, portfolio, card, 1)
    ).toThrow("missing required scope");

    expect(() =>
      getAuthenticatedPortfolioStats(writeAuth, createPortfolio("user-2"))
    ).toThrow("cannot access portfolio");
  });
});

describe("authenticated trade operations", () => {
  it("should create proposals as the authenticated proposer", () => {
    const trade = createAuthenticatedProposal(writeAuth, {
      trade_id: "trade-1",
      receiver_id: "user-2",
      offered_items: [{ card, quantity: 1 }],
      requested_items: [],
    });

    expect(trade.proposer_id).toBe("user-1");
    expect(trade.status).toBe("pending");
  });

  it("should reject proposals for another proposer", () => {
    expect(() =>
      createAuthenticatedProposal(writeAuth, {
        trade_id: "trade-2",
        proposer_id: "user-2",
        receiver_id: "user-3",
        offered_items: [{ card, quantity: 1 }],
        requested_items: [],
      })
    ).toThrow("cannot access trade proposal");
  });
});

describe("authenticated pricing and billing operations", () => {
  it("should enforce pricing write scope", () => {
    const history = createPriceHistory("c1");

    recordAuthenticatedPrice(writeAuth, history, "tcgplayer", 100, true);

    expect(history.points).toHaveLength(1);
    expect(() =>
      recordAuthenticatedPrice(readOnlyAuth, history, "ebay", 120, true)
    ).toThrow("missing required scope");
  });

  it("should create billing sessions only for the authenticated user", () => {
    const checkout = createAuthenticatedProCheckoutSession(writeAuth, {
      price_id: "price_pro_monthly",
      billing_interval: "month",
      success_url: "https://hydra.test/billing/success",
      cancel_url: "https://hydra.test/billing/cancel",
    });

    expect(checkout.client_reference_id).toBe("user-1");
    expect(() =>
      createAuthenticatedProCheckoutSession(writeAuth, {
        user_id: "user-2",
        price_id: "price_pro_monthly",
        billing_interval: "month",
        success_url: "https://hydra.test/billing/success",
        cancel_url: "https://hydra.test/billing/cancel",
      })
    ).toThrow("cannot access checkout");
  });
});
