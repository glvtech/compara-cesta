"use client";

import { useSyncExternalStore } from "react";
import { itemKey, priceKey } from "./prices";
import type { AppState, CatalogItem, CategoryId, ListItem, Market, ShoppingList } from "./types";

const KEY = "compara-cesta:v2";
const LEGACY_KEY = "compara-cesta:v1";
const EMPTY: AppState = { lists: [], markets: [], prices: {}, deleted: {} };

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function read(): AppState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      cache = { ...EMPTY, ...(JSON.parse(raw) as Partial<AppState>) };
    } else {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      cache = { ...EMPTY, lists: legacy ? (JSON.parse(legacy) as ShoppingList[]) : [] };
    }
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

function write(next: AppState) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* armazenamento indisponível: mantém só em memória */
  }
  listeners.forEach((l) => l());
  if (!silent) changeListeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const getState = (): AppState => read();

/** Substitui o estado (usado pela sincronização). `silent` não dispara novo envio ao servidor. */
let silent = false;
export function replaceState(next: AppState) {
  silent = true;
  try {
    write(next);
  } finally {
    silent = false;
  }
}

const changeListeners = new Set<() => void>();
/** Avisa só de mudanças feitas pelo usuário (não das vindas do servidor). */
export function onLocalChange(cb: () => void) {
  changeListeners.add(cb);
  return () => {
    changeListeners.delete(cb);
  };
}

export const useAppState = (): AppState => useSyncExternalStore(subscribe, read, () => EMPTY);
export const useLists = (): ShoppingList[] => useAppState().lists;
export const useMarkets = (): Market[] => useAppState().markets;
export const useList = (id: string): ShoppingList | undefined => useLists().find((l) => l.id === id);

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function mutate(listId: string, fn: (l: ShoppingList) => ShoppingList) {
  const s = read();
  write({ ...s, lists: s.lists.map((l) => (l.id === listId ? { ...fn(l), updatedAt: Date.now() } : l)) });
}

export function createList(name: string, budget: number | null = null): string {
  const list: ShoppingList = { id: uid(), name: name.trim() || "Nova lista", budget, marketId: null, items: [], updatedAt: Date.now() };
  const s = read();
  write({ ...s, lists: [list, ...s.lists] });
  return list.id;
}

export function deleteList(id: string) {
  const s = read();
  write({ ...s, lists: s.lists.filter((l) => l.id !== id), deleted: { ...s.deleted, [id]: Date.now() } });
}

export function setBudget(listId: string, budget: number | null) {
  mutate(listId, (l) => ({ ...l, budget }));
}

export function setListMarket(listId: string, marketId: string | null) {
  mutate(listId, (l) => ({ ...l, marketId }));
}

export function addCatalogItem(listId: string, item: CatalogItem) {
  mutate(listId, (l) => {
    const existing = l.items.find((i) => i.catalogId === item.id);
    if (existing) {
      return { ...l, items: l.items.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i)) };
    }
    const next: ListItem = {
      id: uid(),
      catalogId: item.id,
      name: `${item.name} ${item.unit}`,
      category: item.category,
      quantity: 1,
      checked: false,
      paidPrice: null,
    };
    return { ...l, items: [...l.items, next] };
  });
}

export function addCustomItem(listId: string, name: string, category: CategoryId = "mercearia") {
  const trimmed = name.trim();
  if (!trimmed) return;
  mutate(listId, (l) => ({
    ...l,
    items: [...l.items, { id: uid(), catalogId: null, name: trimmed, category, quantity: 1, checked: false, paidPrice: null }],
  }));
}

export function updateItem(listId: string, itemId: string, patch: Partial<ListItem>) {
  mutate(listId, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
}

export function removeItem(listId: string, itemId: string) {
  mutate(listId, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));
}

/** Anota o preço pago e, se há mercado escolhido na lista, grava no histórico desse mercado. */
export function recordPrice(listId: string, item: ListItem, price: number | null) {
  updateItem(listId, item.id, { paidPrice: price });
  const s = read();
  const list = s.lists.find((l) => l.id === listId);
  if (!list?.marketId || price === null) return;
  write({ ...read(), prices: { ...read().prices, [priceKey(list.marketId, itemKey(item))]: { price, at: Date.now() } } });
}

export function addMarket(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const s = read();
  write({ ...s, markets: [...s.markets, { id: uid(), name: trimmed }] });
}

export function removeMarket(id: string) {
  const s = read();
  const prices = Object.fromEntries(Object.entries(s.prices).filter(([k]) => !k.startsWith(`${id}|`)));
  write({
    ...s,
    markets: s.markets.filter((m) => m.id !== id),
    prices,
    deleted: { ...s.deleted, [id]: Date.now() },
    lists: s.lists.map((l) => (l.marketId === id ? { ...l, marketId: null } : l)),
  });
}

/** Grava vários preços de uma vez (ex.: itens lidos de uma nota) no histórico de um mercado. */
export function savePrices(marketId: string, entries: { key: string; price: number }[]) {
  const s = read();
  const prices = { ...s.prices };
  const at = Date.now();
  for (const e of entries) prices[priceKey(marketId, e.key)] = { price: e.price, at };
  write({ ...s, prices });
}
