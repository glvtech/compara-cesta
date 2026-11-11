"use client";

import { useState } from "react";
import { marketFactor } from "@/lib/prices";
import { addMarket, removeMarket, useAppState } from "@/lib/store";

export default function MarketsPage() {
  const { markets, prices } = useAppState();
  const [name, setName] = useState("");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Mercados</h1>
        <p className="text-sm text-slate-600">Onde você costuma comprar. Os preços que você anota ficam guardados por mercado.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addMarket(name);
          setName("");
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Mercado da esquina"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white">+ Adicionar</button>
      </form>

      {markets.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum mercado ainda. Sem mercados, a comparação usa tipos genéricos estimados.</p>
      ) : (
        <ul className="space-y-3">
          {markets.map((m) => {
            const count = Object.keys(prices).filter((k) => k.startsWith(`${m.id}|`)).length;
            const f = marketFactor(m.id, prices);
            return (
              <li key={m.id} className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex-1">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-slate-500">
                    {count} preço(s) anotado(s)
                    {count > 0 && ` · ${f >= 1 ? "+" : ""}${Math.round((f - 1) * 100)}% vs. referência`}
                  </div>
                </div>
                <button
                  aria-label={`Remover ${m.name}`}
                  onClick={() => confirm(`Remover "${m.name}" e os preços guardados dele?`) && removeMarket(m.id)}
                  className="p-2 text-slate-400 hover:text-red-600"
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
