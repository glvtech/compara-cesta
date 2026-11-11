import { mergeStates } from "./merge";
import { getState, onLocalChange, replaceState } from "./store";
import { getSupabase } from "./supabase";
import type { AppState } from "./types";

export type SyncStatus = "off" | "idle" | "syncing" | "ok" | "error";

let status: SyncStatus = "off";
let lastError = "";
let lastSync = 0;
const subs = new Set<() => void>();
const snapshot = () => ({ status, lastError, lastSync });
let snap = snapshot();

function set(next: SyncStatus, err = "") {
  status = next;
  lastError = err;
  if (next === "ok") lastSync = Date.now();
  snap = snapshot();
  subs.forEach((f) => f());
}

export const subscribeSync = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
export const getSyncSnapshot = () => snap;

const normalize = (d: Partial<AppState> | null): AppState => ({
  lists: d?.lists ?? [],
  markets: d?.markets ?? [],
  prices: d?.prices ?? {},
  deleted: d?.deleted ?? {},
});

/** Baixa o estado remoto, une com o local, aplica e devolve o resultado ao servidor. */
export async function syncNow(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return set("off");
  const { data: sess } = await sb.auth.getSession();
  const user = sess.session?.user;
  if (!user) return set("off");

  set("syncing");
  try {
    const { data, error } = await sb.from("app_state").select("data").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    const merged = mergeStates(getState(), normalize(data?.data ?? null));
    replaceState(merged);
    const { error: upErr } = await sb
      .from("app_state")
      .upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() });
    if (upErr) throw upErr;
    set("ok");
  } catch (e) {
    set("error", e instanceof Error ? e.message : (e as { message?: string })?.message ?? "erro desconhecido");
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Liga a sincronização: ao logar, ao abrir/voltar à aba e (com atraso) após cada alteração local. */
export function startSync(): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  void syncNow();
  const { data: sub } = sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void syncNow();
    if (event === "SIGNED_OUT") set("off");
  });
  const off = onLocalChange(() => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 1500);
  });
  const onVisible = () => document.visibilityState === "visible" && void syncNow();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    sub.subscription.unsubscribe();
    off();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
