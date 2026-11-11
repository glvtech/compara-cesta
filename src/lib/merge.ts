import type { AppState, PriceBook } from "./types";

/**
 * Une dois estados (local e remoto) sem perder dados:
 * - listas: vale a de `updatedAt` maior; remoções (tombstones) vencem se forem mais novas;
 * - mercados: união por id, respeitando remoções;
 * - preços: vale a observação mais recente por chave; preços de mercados removidos saem.
 */
export function mergeStates(a: AppState, b: AppState): AppState {
  const deleted: Record<string, number> = { ...a.deleted };
  for (const [id, at] of Object.entries(b.deleted ?? {})) deleted[id] = Math.max(deleted[id] ?? 0, at);

  const listMap = new Map<string, AppState["lists"][number]>();
  for (const l of [...a.lists, ...b.lists]) {
    const cur = listMap.get(l.id);
    if (!cur || l.updatedAt > cur.updatedAt) listMap.set(l.id, l);
  }
  const lists = [...listMap.values()]
    .filter((l) => (deleted[l.id] ?? 0) < l.updatedAt)
    .sort((x, y) => y.updatedAt - x.updatedAt);

  const marketMap = new Map<string, AppState["markets"][number]>();
  for (const m of [...a.markets, ...b.markets]) marketMap.set(m.id, m);
  const markets = [...marketMap.values()].filter((m) => !deleted[m.id]);
  const alive = new Set(markets.map((m) => m.id));

  const prices: PriceBook = {};
  for (const src of [a.prices, b.prices]) {
    for (const [k, obs] of Object.entries(src)) {
      if (!alive.has(k.split("|")[0])) continue;
      if (!prices[k] || obs.at > prices[k].at) prices[k] = obs;
    }
  }

  return { lists, markets, prices, deleted };
}
