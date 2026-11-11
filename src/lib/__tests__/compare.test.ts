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
