"use client";

import Link from "next/link";
import { useState } from "react";
import { CATALOG } from "@/data/catalog";
import { detectBarcode, lookupBarcode, recognize } from "@/lib/ocr";
import { itemKey } from "@/lib/prices";
import { matchCatalog, parseLabel, parseReceipt } from "@/lib/receipt";
import { brl } from "@/lib/compare";
import { savePrices, useMarkets } from "@/lib/store";

type Mode = "nota" | "etiqueta";
interface Row {
  include: boolean;
  name: string;
  quantity: number;
  price: string;
  catalogId: string; // "" = item livre
}

const toRow = (name: string, quantity: number, price: number | null): Row => {
  const m = matchCatalog(name);
  return { include: price !== null, name, quantity, price: price === null ? "" : String(price).replace(".", ","), catalogId: m?.item.id ?? "" };
};

export default function ScanPage() {
  const markets = useMarkets();
  const [mode, setMode] = useState<Mode>("nota");
  const [marketId, setMarketId] = useState("");
  const [busy, setBusy] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [raw, setRaw] = useState("");
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setRows(null);
    setSaved(0);
    try {
      setBusy("Preparando…");
      const ocr = await recognize(file, (p, s) => setBusy(`${s === "recognizing text" ? "Lendo a imagem" : "Carregando leitor (só na 1ª vez)"} ${Math.round(p * 100)}%`));
      setRaw(ocr.text);
      if (mode === "nota") {
        const parsed = parseReceipt(ocr.text);
        setRows(parsed.map((p) => toRow(p.name, p.quantity, p.unitPrice)));
      } else {
        const label = parseLabel(ocr.text, ocr.words);
        let name = label.name;
        const ean = await detectBarcode(file);
        if (ean) name = (await lookupBarcode(ean)) ?? name;
        setRows([toRow(name, 1, label.price)]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler a imagem.");
    } finally {
      setBusy("");
    }
  }

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function save() {
    if (!rows || !marketId) return;
    const entries = rows
      .filter((r) => r.include)
      .map((r) => ({
        key: r.catalogId || itemKey({ catalogId: null, name: r.name }),
        price: parseFloat(r.price.replace(",", ".")),
      }))
      .filter((e) => Number.isFinite(e.price) && e.price > 0);
    savePrices(marketId, entries);
    setSaved(entries.length);
    setRows(null);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Escanear preços</h1>
        <p className="text-sm text-slate-600">Foto da nota/cupom ou da etiqueta da prateleira. A leitura é feita no seu aparelho.</p>
      </header>

      {markets.length === 0 ? (
        <p>
          Cadastre um mercado primeiro: <Link href="/mercados" className="text-blue-600">Mercados</Link>
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            {(["nota", "etiqueta"] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setRows(null); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${mode === m ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                {m === "nota" ? "🧾 Nota / cupom" : "🏷️ Etiqueta"}
              </button>
            ))}
          </div>

          <select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="">Em qual mercado? (obrigatório)</option>
            {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
            <span className="font-medium text-blue-600">📷 Tirar foto ou escolher imagem</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!!busy}
              onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </>
      )}

      {busy && <p className="text-sm text-slate-600">{busy}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved > 0 && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {saved} preço(s) salvo(s). Veja em <Link href="/comparar" className="underline">Comparar</Link>.
        </p>
      )}

      {rows && (
        <section className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">Não consegui identificar itens. Tente uma foto mais reta, com boa luz, ou use o texto abaixo para anotar à mão.</p>
          ) : (
            <p className="text-sm text-slate-600">Confira antes de salvar. Corrija nome e preço, e ajuste o item do catálogo.</p>
          )}
          {rows.map((r, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} className="h-5 w-5 accent-emerald-600" aria-label="Incluir" />
                <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">R$ unit.</span>
                <input inputMode="decimal" value={r.price} onChange={(e) => update(i, { price: e.target.value })} className="w-24 rounded border border-slate-300 px-2 py-1" />
                {r.quantity !== 1 && <span className="text-xs text-slate-400">qtd {r.quantity}</span>}
                <select value={r.catalogId} onChange={(e) => update(i, { catalogId: e.target.value })} className="min-w-0 flex-1 rounded border border-slate-300 px-1 py-1 text-xs">
                  <option value="">Item livre (sem catálogo)</option>
                  {CATALOG.map((c) => <option key={c.id} value={c.id}>{c.name} {c.unit} · ref. {brl(c.price)}</option>)}
                </select>
              </div>
            </div>
          ))}
          {rows.length > 0 && (
            <button onClick={save} disabled={!marketId}
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-40">
              {marketId ? "Salvar preços no mercado" : "Escolha o mercado acima"}
            </button>
          )}
          <details className="text-xs text-slate-500">
            <summary>Texto lido (para conferência)</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-100 p-2">{raw}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
