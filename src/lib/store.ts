"use client";

import { useSyncExternalStore } from "react";
import type { CatalogItem, CategoryId, ListItem, ShoppingList } from "./types";

const KEY = "compara-cesta:v1";
const EMPTY: ShoppingList[] = [];

let cache: ShoppingList[] | null = null;
const listeners = new Set<() => void>();

function read(): ShoppingList[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ShoppingList[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: ShoppingList[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* armazenamento indisponível: mantém só em memória */
  }
  listeners.forEach((l) => l());
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

export function useLists(): ShoppingList[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useList(id: string): ShoppingList | undefined {
  return useLists().find((l) => l.id === id);
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function mutate(listId: string, fn: (l: ShoppingList) => ShoppingList) {
  write(read().map((l) => (l.id === listId ? { ...fn(l), updatedAt: Date.now() } : l)));
}

export function createList(name: string, budget: number | null = null): string {
  const list: ShoppingList = { id: uid(), name: name.trim() || "Nova lista", budget, items: [], updatedAt: Date.now() };
  write([list, ...read()]);
  return list.id;
}

export function deleteList(id: string) {
  write(read().filter((l) => l.id !== id));
}

export function setBudget(listId: string, budget: number | null) {
  mutate(listId, (l) => ({ ...l, budget }));
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
