"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSupabase } from "@/lib/supabase";
import { getSyncSnapshot, subscribeSync, syncNow } from "@/lib/sync";

const SERVER = { status: "off" as const, lastError: "", lastSync: 0 };

export default function AccountPage() {
  const sb = getSupabase();
  const sync = useSyncExternalStore(subscribeSync, getSyncSnapshot, () => SERVER);
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { error } = await sb!.auth.signInWithPassword(form);
    if (error) setMsg(error.message);
  }

  if (!sb) return <p>Sincronização não configurada.</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Conta e sincronização</h1>
      {email ? (
        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <p>Conectado como <strong>{email}</strong></p>
          <p className="text-sm text-slate-600">
            {sync.status === "syncing" && "Sincronizando…"}
            {sync.status === "ok" && `Sincronizado às ${new Date(sync.lastSync).toLocaleTimeString("pt-BR")}`}
            {sync.status === "error" && `Erro: ${sync.lastError}`}
            {sync.status === "idle" && "Aguardando"}
          </p>
          {sync.status === "error" && /app_state|relation|schema/i.test(sync.lastError) && (
            <p className="text-xs text-amber-800">Parece que a tabela ainda não existe: rode supabase/schema.sql no SQL Editor do Supabase.</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => void syncNow()} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Sincronizar agora</button>
            <button onClick={() => void sb.auth.signOut()} className="rounded-lg border border-slate-300 px-4 py-2">Sair</button>
          </div>
        </div>
      ) : (
        <form onSubmit={login} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Entre para sincronizar celular e computador.</p>
          <input type="email" required autoComplete="email" placeholder="E-mail" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <input type="password" required autoComplete="current-password" placeholder="Senha" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white">Entrar</button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </form>
      )}
    </div>
  );
}
