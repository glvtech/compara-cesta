import { CATALOG_BY_ID } from "@/data/catalog";
import { RETAILERS } from "@/data/retailers";
import type { ListItem, RetailerProfile, RetailerTotal } from "./types";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function multiplierFor(retailer: RetailerProfile, item: Pick<ListItem, "category">): number {
  return retailer.byCategory[item.category] ?? retailer.base;
}

/** Preço de referência de um item da lista; itens fora do catálogo não entram na comparação. */
export function referencePrice(item: ListItem): number | null {
  if (!item.catalogId) return null;
  return CATALOG_BY_ID.get(item.catalogId)?.price ?? null;
}

export function estimateTotal(items: ListItem[], retailer: RetailerProfile): number {
  let total = 0;
  for (const item of items) {
    const ref = referencePrice(item);
    if (ref === null) continue;
    total += ref * multiplierFor(retailer, item) * item.quantity;
  }
  return round2(total);
}

export interface Comparison {
  ranking: RetailerTotal[];
  average: number;
  /** Quanto se economiza comprando na rede mais barata em relação à média. */
  savings: number;
  /** Itens que ficaram de fora por não existirem no catálogo. */
  skipped: number;
}

export function compareList(items: ListItem[], retailers: RetailerProfile[] = RETAILERS): Comparison {
  const ranking = retailers
    .map((retailer) => ({ retailer, total: estimateTotal(items, retailer) }))
    .sort((a, b) => a.total - b.total);
  const average = ranking.length ? round2(ranking.reduce((s, r) => s + r.total, 0) / ranking.length) : 0;
  const savings = ranking.length ? round2(Math.max(0, average - ranking[0].total)) : 0;
  const skipped = items.filter((i) => referencePrice(i) === null).length;
  return { ranking, average, savings, skipped };
}

/** Total do "carrinho": usa o preço anotado se houver; senão a média de referência. */
export function cartTotal(items: ListItem[], onlyChecked = true): number {
  let total = 0;
  for (const item of items) {
    if (onlyChecked && !item.checked) continue;
    const unit = item.paidPrice ?? referencePrice(item) ?? 0;
    total += unit * item.quantity;
  }
  return round2(total);
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
