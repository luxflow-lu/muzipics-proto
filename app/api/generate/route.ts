import { NextRequest, NextResponse } from "next/server";
import { mapAspectToDims, fetchHF, saveBlob, Aspect } from "@/lib/hf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt;
    const negative_prompt: string | undefined = body?.negative_prompt;
    const aspect: Aspect | undefined = body?.aspect;
    const seed: number | undefined = body?.seed;
    const steps: number | undefined = body?.steps;
    const guidance_scale: number | undefined = body?.guidance_scale;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ ok: false, error: "Invalid prompt" }, { status: 400 });
    }

    const { width, height } = mapAspectToDims(aspect);
    const parameters = {
      width,
      height,
      negative_prompt,
      num_inference_steps: Number.isFinite(steps) ? steps : 36,
      guidance_scale: Number.isFinite(guidance_scale as any) ? guidance_scale : 4.0,
      seed,
    };

    const arrayBuffer = await fetchHF(
      "stabilityai/stable-diffusion-3.5-medium",
      { inputs: prompt, parameters }
    );

    const url = await saveBlob("gen/", arrayBuffer, "image/png");
    return NextResponse.json({ ok: true, url, seed, width, height });
  } catch (e: any) {
    const message = e?.message || "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
