import { describe, expect, it } from "vitest";
import { RETAILERS } from "@/data/retailers";
import { cartTotal, compareList, estimateTotal } from "../compare";
import type { ListItem } from "../types";

const item = (over: Partial<ListItem>): ListItem => ({
  id: "x", catalogId: "arroz-5kg", name: "Arroz", category: "graos",
  quantity: 1, checked: false, paidPrice: null, ...over,
});

describe("compare", () => {
  it("multiplica preço de referência, multiplicador da rede e quantidade", () => {
    const atacarejo = RETAILERS.find((r) => r.id === "atacarejo")!;
    expect(estimateTotal([item({ quantity: 2 })], atacarejo)).toBe(52.8); // 30 * 0.88 * 2
  });

  it("ordena do mais barato ao mais caro e calcula economia sobre a média", () => {
    const c = compareList([item({})]);
    const totals = c.ranking.map((r) => r.total);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
    expect(c.savings).toBeGreaterThan(0);
  });

  it("ignora itens livres e os contabiliza como ignorados", () => {
    const c = compareList([item({}), item({ id: "y", catalogId: null })]);
    expect(c.skipped).toBe(1);
  });

  it("carrinho usa preço anotado quando existe e só conta marcados", () => {
    const items = [item({ checked: true, paidPrice: 25, quantity: 2 }), item({ id: "z", checked: false })];
    expect(cartTotal(items, true)).toBe(50);
    expect(cartTotal(items, false)).toBe(80); // 50 + 30 (referência)
  });
});

import { compareMarkets, marketFactor } from "../prices";

describe("mercados reais", () => {
  const markets = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  it("usa o preço observado e estima o resto com o fator do mercado", () => {
    const items = [item({ quantity: 2 }), item({ id: "f", catalogId: "feijao-1kg", category: "graos" })];
    const prices = { "a|arroz-5kg": { price: 20, at: 1 } };
    const r = compareMarkets(items, markets, prices);
    const a = r.find((x) => x.market.id === "a")!;
    expect(a.known).toBe(1);
    // arroz: 20*2 = 40; feijão: 8,5 * fator(a)
    expect(a.total).toBeCloseTo(40 + 8.5 * marketFactor("a", prices), 2);
    expect(r[0].market.id).toBe("a"); // A é mais barato que B (referência)
  });
  it("itens livres só entram com preço observado", () => {
    const livre = item({ catalogId: null, name: "Pão francês" });
    const r = compareMarkets([livre], markets, { "b|livre:pao frances": { price: 10, at: 1 } });
    expect(r.find((x) => x.market.id === "b")!.total).toBe(10);
    expect(r.find((x) => x.market.id === "a")!.unpriced).toBe(1);
  });
});
