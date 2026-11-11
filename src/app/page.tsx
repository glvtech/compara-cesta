"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addCatalogItem, createList, deleteList, useLists } from "@/lib/store";
import { CATALOG_BY_ID } from "@/data/catalog";

const SAMPLE = ["arroz-5kg", "feijao-1kg", "macarrao-500g", "frango-peito-1kg", "leite-1l", "ovos-12", "cafe-500g", "oleo-900ml"];

export default function Home() {
  const lists = useLists();
  const router = useRouter();
  const [name, setName] = useState("");

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const id = createList(name);
    setName("");
    router.push(`/lista/${id}`);
  }

  function onSample() {
    const id = createList("Mercado do mês", 400);
    for (const cid of SAMPLE) {
      const item = CATALOG_BY_ID.get(cid);
      if (item) addCatalogItem(id, item);
    }
    router.push(`/lista/${id}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Compara Cesta</h1>
        <p className="text-sm text-slate-600">Descubra onde a sua lista sai mais barata em SP.</p>
      </header>

      <form onSubmit={onCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da nova lista"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">+ Nova</button>
      </form>

      {lists.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-slate-600">Você ainda não tem listas.</p>
          <button onClick={onSample} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Criar uma lista de exemplo
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {lists.map((l) => {
            const done = l.items.filter((i) => i.checked).length;
            return (
              <li key={l.id} className="flex items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
                <Link href={`/lista/${l.id}`} className="flex-1">
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-sm text-slate-500">
                    {l.items.length} itens · {done} marcados
                  </div>
                </Link>
                <button
                  aria-label={`Excluir ${l.name}`}
                  onClick={() => confirm(`Excluir "${l.name}"?`) && deleteList(l.id)}
                  className="rounded p-2 text-slate-400 hover:text-red-600"
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
