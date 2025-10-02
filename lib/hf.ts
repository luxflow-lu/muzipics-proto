import { put } from "@vercel/blob";

export type Aspect = "1:1" | "4:5" | "16:9";

export function mapAspectToDims(aspect?: Aspect): { width: number; height: number } {
  switch (aspect) {
    case "4:5":
      return { width: 1024, height: 1280 };
    case "16:9":
      return { width: 1280, height: 720 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}

export async function fetchHF<TPayload extends Record<string, any>>(model: string, payload: TPayload): Promise<ArrayBuffer> {
  if (!process.env.HF_API_TOKEN) {
    throw new Error("Missing HF_API_TOKEN env var");
  }
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = ct.includes("application/json") ? await res.json() : await res.text();
      msg = typeof err === "string" ? err : err?.error || err?.message || msg;
    } catch {}
    throw new Error(`HF error (${res.status}): ${msg}`);
  }
  return await res.arrayBuffer();
}

export async function saveBlob(prefix: string, arrayBuffer: ArrayBuffer, contentType: string = "image/png"): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN env var");
  }
  const key = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${contentType.includes("png") ? "png" : contentType.includes("jpeg") ? "jpg" : "bin"}`;
  const res = await put(key, Buffer.from(arrayBuffer), {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType,
  });
  return res.url;
}
