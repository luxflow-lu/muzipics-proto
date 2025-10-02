import { NextRequest, NextResponse } from "next/server";
import { saveBlob } from "@/lib/hf";

export const runtime = "nodejs";

async function fetchHFWithImage(model: string, image: ArrayBuffer): Promise<ArrayBuffer> {
  if (!process.env.HF_API_TOKEN) {
    throw new Error("Missing HF_API_TOKEN env var");
  }
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
      Accept: "image/png",
      "Content-Type": "image/png",
    },
    body: Buffer.from(image),
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageUrl: string | undefined = body?.imageUrl;
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ ok: false, error: "Missing imageUrl" }, { status: 400 });
    }

    // Fetch source image (proxy) then send bytes to HF upscaler
    const srcRes = await fetch(imageUrl);
    if (!srcRes.ok) {
      return NextResponse.json({ ok: false, error: `Cannot fetch source image (${srcRes.status})` }, { status: 400 });
    }
    const srcBytes = await srcRes.arrayBuffer();

    const outBytes = await fetchHFWithImage(
      "stabilityai/stable-diffusion-x4-upscaler",
      srcBytes
    );

    const url = await saveBlob("upscale/", outBytes, "image/png");
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    const message = e?.message || "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
