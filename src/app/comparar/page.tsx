"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { brl, compareList } from "@/lib/compare";
import { useLists } from "@/lib/store";

function Compare() {
  const lists = useLists();
  const params = useSearchParams();
  const selectedId = params.get("lista") ?? lists[0]?.id;
  const list = lists.find((l) => l.id === selectedId);
  const result = list ? compareList(list.items) : null;
  const max = result ? Math.max(...result.ranking.map((r) => r.total), 1) : 1;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Comparar</h1>
        <p className="text-sm text-slate-600">Onde a sua cesta sai mais barata (SP)</p>
      </header>

      {lists.length === 0 && (
        <p className="text-slate-600">
          Crie uma lista primeiro. <Link href="/" className="text-blue-600">Ir para Listas</Link>
        </p>
      )}

      {list && result && (
        <>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => (
              <Link
                key={l.id}
                href={`/comparar?lista=${l.id}`}
                className={`rounded-full border px-3 py-1 text-sm ${l.id === list.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}
              >
                {l.name} · {l.items.length}
              </Link>
            ))}
          </div>

          {result.ranking[0].total === 0 ? (
            <p className="text-slate-600">Adicione produtos do catálogo à lista para ver a comparação.</p>
          ) : (
            <>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">Comprando no mais barato, você deixa de gastar</p>
                <p className="text-3xl font-bold text-emerald-700">{brl(result.savings)}</p>
                <p className="text-xs text-emerald-800">em relação à média dos tipos de mercado</p>
              </div>

              <ol className="space-y-3">
                {result.ranking.map((r, idx) => (
                  <li key={r.retailer.id} className={`rounded-xl bg-white p-4 shadow-sm ${idx === 0 ? "ring-2 ring-emerald-400" : ""}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{idx === 0 && "🏆 "}{r.retailer.name}</span>
                      <span className={`font-bold ${idx === 0 ? "text-emerald-600" : ""}`}>~{brl(r.total)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{r.retailer.description}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100">
                      <div className="h-full bg-blue-500" style={{ width: `${(r.total / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
              {result.skipped > 0 && (
                <p className="text-xs text-slate-500">
                  {result.skipped} item(ns) livre(s) ficaram fora da comparação por não terem preço de referência.
                </p>
              )}
            </>
          )}
        </>
      )}
      <Disclaimer />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <Compare />
    </Suspense>
  );
}
