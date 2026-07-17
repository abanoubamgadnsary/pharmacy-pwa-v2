import { db, DrugCatalog } from "../db";

const CATALOG_URL =
  "https://raw.githubusercontent.com/mahmoudfalous/eg-drugs/main/data/eg_drugs.json";

const CATALOG_VERSION_KEY = "catalog_version";
const CATALOG_VERSION = "2026-07"; // bump this to force a re-download

function sanitizeJsonText(text: string): string {
  let inString = false;
  let escaped = false;
  let result = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (!inString) {
      result += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = false;
      continue;
    }

    const code = char.charCodeAt(0);
    if (code === 10) {
      result += "\\n";
      continue;
    }
    if (code === 13) {
      result += "\\r";
      continue;
    }
    if (code === 9) {
      result += "\\t";
      continue;
    }
    if (code < 32) {
      result += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }

    result += char;
  }

  return result;
}

export type LoadProgress = {
  stage: "checking" | "downloading" | "saving" | "done" | "error";
  percent: number;
  message: string;
  messageAr: string;
};

type ProgressCallback = (p: LoadProgress) => void;

/** Returns true if the catalog is already loaded in IndexedDB */
export async function isCatalogLoaded(): Promise<boolean> {
  const storedVersion = localStorage.getItem(CATALOG_VERSION_KEY);
  if (storedVersion !== CATALOG_VERSION) return false;
  const count = await db.catalog.count();
  return count > 0;
}

/**
 * Downloads the Egyptian drug catalog and stores it in IndexedDB.
 * Calls onProgress with updates throughout.
 */
export async function loadCatalog(onProgress: ProgressCallback): Promise<void> {
  try {
    onProgress({
      stage: "checking",
      percent: 5,
      message: "Checking catalog…",
      messageAr: "جاري التحقق من قاعدة البيانات…",
    });

    // ── Download ────────────────────────────────────────────────────────────
    onProgress({
      stage: "downloading",
      percent: 15,
      message: "Downloading Egyptian drug database (24,868 drugs)…",
      messageAr: "جاري تحميل قاعدة الأدوية المصرية (24,868 دواء)…",
    });

    const response = await fetch(CATALOG_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // stream into text while tracking progress
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    let received = 0;
    const chunks: Uint8Array[] = [];
    const reader = response.body!.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      const downloadPct = contentLength
        ? Math.round(15 + (received / contentLength) * 50)
        : 40;
      onProgress({
        stage: "downloading",
        percent: downloadPct,
        message: `Downloading… ${Math.round(received / 1024)} KB`,
        messageAr: `جاري التحميل… ${Math.round(received / 1024)} كيلوبايت`,
      });
    }

    // O(n) single-pass merge — pre-allocate the exact buffer size
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
    const text = new TextDecoder().decode(merged);

    // ── Parse ────────────────────────────────────────────────────────────────
    onProgress({
      stage: "saving",
      percent: 68,
      message: "Parsing data…",
      messageAr: "جاري معالجة البيانات…",
    });

    const sanitizedText = sanitizeJsonText(text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = JSON.parse(sanitizedText);

    // normalise field names defensively
    const records: DrugCatalog[] = raw.map((r) => ({
      commercial_name_en: (r.commercial_name_en ?? r.name_en ?? r.name ?? "")
        .toString()
        .trim(),
      commercial_name_ar: (r.commercial_name_ar ?? r.name_ar ?? r.arabic ?? "")
        .toString()
        .trim(),
      scientific_composition: (
        r.scientific_composition ??
        r.active_ingredient ??
        r.composition ??
        r.active ??
        ""
      )
        .toString()
        .trim(),
      manufacturer: (r.manufacturer ?? r.company ?? "").toString().trim(),
      drug_class: (r.drug_class ?? r.category ?? "").toString().trim(),
      route: (r.route ?? r.route_of_administration ?? "").toString().trim(),
      price_egp: parseFloat(r.price_egp ?? r.price ?? 0) || 0,
      barcode: (r.barcode ?? "").toString().trim(),
    }));

    // ── Save in batches ───────────────────────────────────────────────────────
    onProgress({
      stage: "saving",
      percent: 72,
      message: "Clearing old catalog…",
      messageAr: "جاري مسح البيانات القديمة…",
    });

    await db.catalog.clear();

    const BATCH = 500;
    for (let i = 0; i < records.length; i += BATCH) {
      await db.catalog.bulkAdd(records.slice(i, i + BATCH));
      const pct = Math.round(72 + ((i + BATCH) / records.length) * 25);
      onProgress({
        stage: "saving",
        percent: Math.min(pct, 97),
        message: `Saving… ${Math.min(i + BATCH, records.length).toLocaleString()} / ${records.length.toLocaleString()}`,
        messageAr: `جاري الحفظ… ${Math.min(i + BATCH, records.length).toLocaleString()} / ${records.length.toLocaleString()}`,
      });
    }

    localStorage.setItem(CATALOG_VERSION_KEY, CATALOG_VERSION);

    onProgress({
      stage: "done",
      percent: 100,
      message: `Done! ${records.length.toLocaleString()} drugs loaded.`,
      messageAr: `تم! تم تحميل ${records.length.toLocaleString()} دواء بنجاح.`,
    });
  } catch (err) {
    console.error("Catalog load error:", err);
    onProgress({
      stage: "error",
      percent: 0,
      message: "Failed to download catalog. Check your internet connection.",
      messageAr: "فشل تحميل قاعدة البيانات. تحقق من الإنترنت.",
    });
    throw err;
  }
}

/** Search catalog by name (Arabic or English) */
export async function searchCatalog(
  query: string,
  limit = 20,
): Promise<DrugCatalog[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  return db.catalog
    .filter(
      (d) =>
        d.barcode.toLowerCase().includes(q) ||
        d.commercial_name_en.toLowerCase().includes(q) ||
        d.commercial_name_ar.toLowerCase().includes(q) ||
        d.scientific_composition.toLowerCase().includes(q) ||
        d.manufacturer.toLowerCase().includes(q),
    )
    .limit(limit)
    .toArray();
}
