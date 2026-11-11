import { CATALOG } from "@/data/catalog";
import type { CatalogItem } from "./types";

export interface ParsedLine {
  name: string;
  quantity: number;
  /** Preço unitário em reais. */
  unitPrice: number;
}

const MONEY = /\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g;
const SKIP =
  /(total|troco|dinheiro|cart[aã]o|cnpj|cpf|icms|tribut|desconto|acr[eé]scimo|forma de pag|valor pago|nfc-?e|consumidor|chave|protocolo|s[eé]rie|n[uú]mero|data de|via do|pix|cr[eé]dito|d[eé]bito|volume|qtd\.? ?total|opera[dç]|documento|auxiliar|consulte|autoriza)/i;

const toNumber = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Corrige leituras comuns do OCR: "5.49" -> "5,49" e espaços dentro de valores. */
export function fixOcrMoney(line: string): string {
  return line.replace(/(\d)\s*[.,]\s*(\d{2})(?!\d)/g, "$1,$2").replace(/(\d),(\d{2}),(\d{2})/g, "$1,$2 $3");
}

function cleanName(raw: string): string {
  const name = raw
    .replace(/\b\d{6,14}\b/g, " ") // código de barras / interno
    .replace(/^\s*\d{1,3}\s+/, " ") // número do item
    .replace(/[|_*]+/g, " ")
    .replace(/\b(un|kg|pc|cx|pct|lt)\b\s*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

const hasLetters = (s: string) => (s.match(/[A-Za-zÀ-ú]/g) ?? []).length >= 3;

// "2 UN x 5,49 10,98" | "1,350 KG X 12,90 17,42"
const QTY_LINE = /(\d+(?:[.,]\d+)?)\s*(?:un|kg|pc|cx|lt|l|g|ml|pct|fr)?\s*[xX*]\s*(\d+,\d{2})\s+(\d+,\d{2})\s*$/i;

/** Extrai itens (nome, quantidade, preço unitário) do texto de uma nota/cupom lido por OCR. */
export function parseReceipt(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).map((l) => fixOcrMoney(l.trim())).filter(Boolean);
  const out: ParsedLine[] = [];
  let pendingName = "";

  for (const line of lines) {
    if (SKIP.test(line)) {
      pendingName = "";
      continue;
    }
    const money = line.match(MONEY) ?? [];

    const q = line.match(QTY_LINE);
    if (q) {
      const quantity = parseFloat(q[1].replace(",", "."));
      const unitPrice = toNumber(q[2]);
      const nameHere = cleanName(line.slice(0, q.index));
      const name = hasLetters(nameHere) ? nameHere : pendingName;
      if (hasLetters(name) && unitPrice > 0) out.push({ name, quantity: quantity || 1, unitPrice });
      pendingName = "";
      continue;
    }

    if (money.length >= 1) {
      const idx = line.indexOf(money[0]!);
      const name = cleanName(line.slice(0, idx)).replace(/\s+(?:(?:un|kg|pc|cx|pct)\s+)?\d+(?:,\d+)?\s*$/i, "");
      if (!hasLetters(name)) continue;
      const total = toNumber(money[money.length - 1]);
      let unitPrice = total;
      let quantity = 1;
      if (money.length >= 2) {
        const unit = toNumber(money[money.length - 2]);
        const ratio = unit > 0 ? total / unit : 1;
        if (unit > 0 && ratio >= 1 && ratio <= 100 && Math.abs(ratio * 1000 - Math.round(ratio * 1000)) < 25) {
          unitPrice = unit;
          quantity = Math.round(ratio * 1000) / 1000;
        }
      }
      if (unitPrice > 0) out.push({ name, quantity, unitPrice });
      pendingName = "";
    } else if (hasLetters(line)) {
      pendingName = cleanName(line);
    }
  }
  return out;
}

export interface LabelWord {
  text: string;
  /** Altura da caixa da palavra na imagem (o preço grande da etiqueta é o maior). */
  height: number;
}

/** Etiqueta de gôndola: o preço é o valor de maior fonte (ou o que vem depois de "por"). */
export function parseLabel(text: string, words: LabelWord[] = []): { name: string; price: number | null } {
  const fixed = fixOcrMoney(text);
  const por = fixed.match(/\bpor\b[^\d]{0,6}(\d+,\d{2})/i);
  let price: number | null = por ? toNumber(por[1]) : null;

  if (price === null && words.length) {
    let best: { v: number; h: number } | null = null;
    for (const w of words) {
      const m = fixOcrMoney(w.text).match(/^R?\$?\s*(\d+,\d{2})$/);
      if (m && (!best || w.height > best.h)) best = { v: toNumber(m[1]), h: w.height };
    }
    if (best) price = best.v;
  }
  if (price === null) {
    const all = fixed.match(MONEY);
    if (all?.length) price = toNumber(all[all.length - 1]);
  }

  const name =
    fixed
      .split(/\r?\n/)
      .map((l) => l.replace(MONEY, " ").replace(/R\$|\bpor\b|\bde\b\s*$|\/\s*kg/gi, " ").replace(/\s+/g, " ").trim())
      .filter(hasLetters)
      .sort((a, b) => b.length - a.length)[0] ?? "";
  return { name, price };
}

const STOP = new Set(["de", "da", "do", "com", "sem", "tipo", "para", "uht", "cx", "un", "pct"]);
const words = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));

const size = (s: string): string | null => {
  const m = norm(s).match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|lt|ml)\b/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(",", "."));
  let u = m[2] === "lt" ? "l" : m[2];
  if (u === "g") { n /= 1000; u = "kg"; }
  if (u === "ml") { n /= 1000; u = "l"; }
  return `${n}${u}`;
};

export interface Match {
  item: CatalogItem;
  score: number;
}

/** Procura o item do catálogo mais parecido com o nome lido; null se nada convence. */
export function matchCatalog(name: string): Match | null {
  const w = new Set(words(name));
  const s = size(name);
  let best: Match | null = null;
  for (const item of CATALOG) {
    const need = words(item.name);
    if (!need.length) continue;
    let score = need.filter((t) => w.has(t) || [...w].some((x) => x.startsWith(t) || t.startsWith(x) && x.length >= 4)).length / need.length;
    const cs = size(item.unit);
    if (s && cs) score = s === cs ? score + 0.2 : score - 0.6;
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 0.7 ? best : null;
}
