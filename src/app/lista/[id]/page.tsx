"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AddItem } from "@/components/AddItem";
import { CATEGORIES } from "@/data/catalog";
import { brl, cartTotal, referencePrice } from "@/lib/compare";
import { recordPrice, removeItem, setBudget, setListMarket, updateItem, useAppState, useList } from "@/lib/store";
import { itemKey, priceKey } from "@/lib/prices";
import type { CategoryId, ListItem } from "@/lib/types";

function PriceNote({ listId, item }: { listId: string; item: ListItem }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.paidPrice?.toString().replace(".", ",") ?? "");

  function save() {
    const n = parseFloat(val.replace(",", "."));
    recordPrice(listId, item, Number.isFinite(n) && n >= 0 ? n : null);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-sm"
          placeholder="0,00"
        />
        <button onClick={save} className="text-sm text-blue-600">OK</button>
      </span>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-sm text-blue-600">
      {item.paidPrice !== null ? `Pago: ${brl(item.paidPrice)} (un.)` : "+ anotar preço"}
    </button>
  );
}

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const list = useList(id);
  const { markets, prices } = useAppState();

  if (!list) {
    return (
      <div className="space-y-3">
        <p>Lista não encontrada.</p>
        <Link href="/" className="text-blue-600">← Voltar</Link>
      </div>
    );
  }

  const total = list.items.length;
  const checked = list.items.filter((i) => i.checked).length;
  const spent = cartTotal(list.items, true);
  const planned = cartTotal(list.items, false);
  const over = list.budget !== null && spent > list.budget;
  const pct = list.budget ? Math.min(100, (spent / list.budget) * 100) : 0;

  const groups = new Map<CategoryId, ListItem[]>();
  for (const it of list.items) groups.set(it.category, [...(groups.get(it.category) ?? []), it]);

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-blue-600">← Listas</Link>
      <header>
        <h1 className="text-2xl font-bold">{list.name}</h1>
        <p className="text-sm text-slate-500">{checked} de {total} no carrinho</p>
        <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
          <div className="h-full bg-emerald-500" style={{ width: total ? `${(checked / total) * 100}%` : 0 }} />
        </div>
      </header>

      <AddItem listId={list.id} />

      {total === 0 && <p className="text-center text-sm text-slate-500">Busque um produto acima para começar.</p>}

      {[...groups.entries()].map(([cat, items]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {CATEGORIES[cat].emoji} {CATEGORIES[cat].label}
          </h2>
          {items.map((it) => (
            <div key={it.id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={it.checked}
                  onChange={(e) => updateItem(list.id, it.id, { checked: e.target.checked })}
                  className="h-5 w-5 accent-emerald-600"
                  aria-label={`Marcar ${it.name}`}
                />
                <span className={`flex-1 ${it.checked ? "text-slate-400 line-through" : ""}`}>{it.name}</span>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2">
                  <button
                    aria-label="Diminuir"
                    onClick={() => updateItem(list.id, it.id, { quantity: Math.max(1, it.quantity - 1) })}
                    className="px-1 text-lg text-blue-600"
                  >−</button>
                  <span className="w-5 text-center">{it.quantity}</span>
                  <button
                    aria-label="Aumentar"
                    onClick={() => updateItem(list.id, it.id, { quantity: it.quantity + 1 })}
                    className="px-1 text-lg text-blue-600"
                  >+</button>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between pl-8">
                <PriceNote listId={list.id} item={it} />
                <span className="text-xs text-slate-400">
                  {(() => {
                    const here = list.marketId ? prices[priceKey(list.marketId, itemKey(it))] : undefined;
                    if (here) return `aqui: ${brl(here.price)}`;
                    return referencePrice(it) !== null ? `ref. ${brl(referencePrice(it)!)}` : "sem referência";
                  })()}
                </span>
                <button aria-label={`Remover ${it.name}`} onClick={() => removeItem(list.id, it.id)} className="text-slate-400 hover:text-red-600">🗑</button>
              </div>
            </div>
          ))}
        </section>
      ))}

      <section className="space-y-3 rounded-xl bg-blue-600 p-4 text-white">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">🏪 Modo mercado</span>
          <span className="text-xs text-blue-100">Previsto: {brl(planned)}</span>
        </div>
        <div className="text-3xl font-bold">{brl(spent)}</div>
        <label className="flex items-center gap-2 text-sm">
          Mercado
          <select
            value={list.marketId ?? ""}
            onChange={(e) => setListMarket(list.id, e.target.value || null)}
            className="min-w-0 flex-1 rounded bg-white/90 px-2 py-1 text-slate-900"
          >
            <option value="">— escolher —</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        {markets.length === 0 && (
          <Link href="/mercados" className="block text-xs underline">Cadastre seus mercados para guardar os preços</Link>
        )}
        {markets.length > 0 && !list.marketId && (
          <p className="text-xs text-blue-100">Escolha o mercado para os preços anotados irem para o histórico dele.</p>
        )}
        <label className="flex items-center gap-2 text-sm">
          Orçamento
          <input
            inputMode="decimal"
            defaultValue={list.budget?.toString().replace(".", ",") ?? ""}
            onBlur={(e) => {
              const n = parseFloat(e.target.value.replace(",", "."));
              setBudget(list.id, Number.isFinite(n) && n > 0 ? n : null);
            }}
            placeholder="R$ 0,00"
            className="w-28 rounded bg-white/90 px-2 py-1 text-slate-900"
          />
        </label>
        {list.budget !== null && (
          <>
            <div className="h-2 overflow-hidden rounded bg-white/30">
              <div className={`h-full ${over ? "bg-red-300" : "bg-white"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm">
              {over ? `Estourou o orçamento em ${brl(spent - list.budget)}` : `Restam ${brl(list.budget - spent)}`}
            </p>
          </>
        )}
        <Link href={`/comparar?lista=${list.id}`} className="block rounded-lg bg-white py-2 text-center font-medium text-blue-700">
          Comparar mercados para esta lista
        </Link>
      </section>
    </div>
  );
}
