import type { LabelWord } from "./receipt";

export interface OcrResult {
  text: string;
  words: LabelWord[];
}

/** Reduz e converte para tons de cinza com contraste, o que melhora bastante o OCR de fotos de celular. */
async function preprocess(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - lo) * 255) / range;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** OCR no próprio aparelho (Tesseract.js, português). A imagem não é enviada a nenhum servidor. */
export async function recognize(file: Blob, onProgress?: (p: number, status: string) => void): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");
  const canvas = await preprocess(file);
  const worker = await createWorker("por", 1, {
    logger: (m: { progress: number; status: string }) => onProgress?.(m.progress, m.status),
  });
  try {
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const words: LabelWord[] = [];
    for (const b of data.blocks ?? [])
      for (const p of b.paragraphs)
        for (const l of p.lines)
          for (const w of l.words) words.push({ text: w.text, height: w.bbox.y1 - w.bbox.y0 });
    return { text: data.text, words };
  } finally {
    await worker.terminate();
  }
}

/** Lê o código de barras (EAN) da foto, se o navegador suportar (Chrome no Android). */
export async function detectBarcode(file: Blob): Promise<string | null> {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(i: ImageBitmap): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (!BD) return null;
  try {
    const found = await new BD({ formats: ["ean_13", "ean_8", "upc_a"] }).detect(await createImageBitmap(file));
    return found[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

/** Nome do produto pelo código de barras, no Open Food Facts (gratuito, sem chave). */
export async function lookupBarcode(ean: string): Promise<string | null> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,brands,quantity`);
    const j = (await r.json()) as { product?: { product_name?: string; brands?: string; quantity?: string } };
    const p = j.product;
    if (!p?.product_name) return null;
    return [p.product_name, p.brands?.split(",")[0], p.quantity].filter(Boolean).join(" ");
  } catch {
    return null;
  }
}
