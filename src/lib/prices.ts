import { CATALOG_BY_ID } from "@/data/catalog";
import type { ListItem, Market, PriceBook } from "./types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Identifica o produto: id do catálogo ou nome normalizado para itens livres. */
export const itemKey = (item: Pick<ListItem, "catalogId" | "name">): string =>
  item.catalogId ?? `livre:${norm(item.name)}`;

export const priceKey = (marketId: string, key: string) => `${marketId}|${key}`;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fator do mercado em relação ao preço de referência, aprendido das observações.
 * Média das razões preço/referência, puxada para 1 por um prior (K observações "neutras").
 */
export function marketFactor(marketId: string, prices: PriceBook, prior = 3): number {
  let sum = 0;
  let n = 0;
  for (const [k, obs] of Object.entries(prices)) {
    if (!k.startsWith(`${marketId}|`)) continue;
    const ref = CATALOG_BY_ID.get(k.slice(marketId.length + 1))?.price;
    if (!ref) continue;
    sum += Math.min(2, Math.max(0.5, obs.price / ref)); // limita outliers (ex.: erro de digitação)
    n += 1;
  }
  return (sum + prior) / (n + prior);
}

export interface MarketTotal {
  market: Market;
  total: number;
  /** Itens com preço real observado neste mercado. */
  known: number;
  /** Itens sem referência nem observação (não entram no total). */
  unpriced: number;
  count: number;
}

export function compareMarkets(items: ListItem[], markets: Market[], prices: PriceBook): MarketTotal[] {
  return markets
    .map((market) => {
      const factor = marketFactor(market.id, prices);
      let total = 0;
      let known = 0;
      let unpriced = 0;
      for (const item of items) {
        const real = prices[priceKey(market.id, itemKey(item))]?.price;
        const ref = item.catalogId ? CATALOG_BY_ID.get(item.catalogId)?.price : undefined;
        if (real !== undefined) {
          total += real * item.quantity;
          known += 1;
        } else if (ref !== undefined) {
          total += ref * factor * item.quantity;
        } else {
          unpriced += 1;
        }
      }
      return { market, total: round2(total), known, unpriced, count: items.length };
    })
    .sort((a, b) => a.total - b.total);
}
