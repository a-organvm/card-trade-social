/**
 * card-trade-social — Hydra TCG Platform
 * Part of the organvm eight-organ system (ORGAN-III: Commerce).
 */

export const VERSION = "0.1.0";

export function main(): void {
  console.log(`card-trade-social v${VERSION}`);
}

export * from "./card";
export * from "./portfolio";
export * from "./trade";
export * from "./pricing";
export * from "./subscription";
