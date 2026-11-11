"use client";

import { useMemo, useState } from "react";
import { CATALOG } from "@/data/catalog";
import { addCatalogItem, addCustomItem } from "@/lib/store";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AddItem({ listId }: { listId: string }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    return CATALOG.filter((i) => norm(i.name).includes(n)).slice(0, 6);
  }, [q]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar produto para adicionar…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      {q.trim() && (
        <ul className="divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
          {results.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => {
                  addCatalogItem(listId, i);
                  setQ("");
                }}
                className="flex w-full justify-between px-3 py-2 text-left hover:bg-slate-50"
              >
                <span>
                  {i.name} <span className="text-sm text-slate-500">{i.unit}</span>
                </span>
                <span className="text-blue-600">+</span>
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => {
                addCustomItem(listId, q);
                setQ("");
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              Adicionar “{q.trim()}” como item livre (fica fora da comparação)
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
