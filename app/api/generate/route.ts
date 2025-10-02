import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.HUGGING_FACE_API_TOKEN) {
      return NextResponse.json({ error: "Missing HUGGING_FACE_API_TOKEN" }, { status: 500 });
    }

    const {
      prompt,
      negativePrompt = "blurry, lowres, bad anatomy, extra fingers, watermark, jpeg artifacts, text artifacts, deformed, oversaturated",
      steps = 40,
      guidance = 8.5,
      width = 1024,
      height = 1024,
      model: modelKey = "sdxl-base",
    } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    // Validate & clamp parameters
    const clamp = (v: number, min: number, max: number, def: number) =>
      Number.isFinite(v as any) ? Math.min(Math.max(v as number, min), max) : def;
    const roundTo = (v: number, step: number) => Math.round(v / step) * step;
    const _steps = clamp(Number(steps), 5, 75, 40);
    const _guidance = clamp(Number(guidance), 1, 15, 8.5);
    const _width = clamp(roundTo(Number(width) || 1024, 8), 256, 1536, 1024);
    const _height = clamp(roundTo(Number(height) || 1024, 8), 256, 1536, 1024);

    // Map friendly keys to HF models
    const MODEL_MAP: Record<string, string> = {
      "sdxl-base": "stabilityai/stable-diffusion-xl-base-1.0",
      "sdxl-turbo": "stabilityai/sdxl-turbo",
      "dreamshaper-xl": "Lykon/dreamshaper-xl-v2",
      "realvis-xl": "SG161222/RealVisXL_V4.0",
    };
    const model = MODEL_MAP[modelKey] || MODEL_MAP["sdxl-base"];

    let response = await fetch(`https://api-inference.huggingface.co/models/${model}` as string, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGING_FACE_API_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "image/png",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          guidance_scale: _guidance,
          num_inference_steps: _steps,
          negative_prompt: negativePrompt,
          width: _width,
          height: _height,
        },
        options: { wait_for_model: true },
      }),
    });

    // HF may return JSON error with application/json content-type
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      // If model not found, retry with SDXL base
      if (response.status === 404 && model !== "stabilityai/stable-diffusion-xl-base-1.0") {
        const fallbackModel = "stabilityai/stable-diffusion-xl-base-1.0";
        response = await fetch(`https://api-inference.huggingface.co/models/${fallbackModel}` as string, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HUGGING_FACE_API_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "image/png",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              guidance_scale: _guidance,
              num_inference_steps: _steps,
              negative_prompt: negativePrompt,
              width: _width,
              height: _height,
            },
            options: { wait_for_model: true },
          }),
        });
      }
    }

    // Re-check after potential fallback
    const contentType2 = response.headers.get("content-type") || "";
    if (!response.ok) {
      const errPayload = contentType2.includes("application/json") ? await response.json().catch(() => ({})) : await response.text().catch(() => "");
      // Common cases: 503 model loading, 401/403 bad token, rate limits
      const message = typeof errPayload === "string" ? errPayload : (errPayload?.error || errPayload?.message || JSON.stringify(errPayload));
      const status = response.status || 500;
      return NextResponse.json({ error: `HF error (${status}): ${message}` }, { status: status === 0 ? 500 : status });
    }

    // When OK, the body is image bytes
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ url: dataUrl });
  } catch (err: any) {
    console.error("/api/generate error (HF):", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
