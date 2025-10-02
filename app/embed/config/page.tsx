"use client";

import { useEffect, useMemo, useState } from "react";

// Small, standalone config-only UI for Webflow split embed.
// Sends generated image URL + meta to the sibling iframe via BroadcastChannel("muzipics-bc").
export default function EmbedConfig() {
  const bc = useMemo(() => (typeof window !== "undefined" ? new BroadcastChannel("muzipics-bc") : null), []);

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("modern");
  const [preset, setPreset] = useState("none");
  const [orientation, setOrientation] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STYLE_PROMPTS: Record<string, string> = {
    modern: "clean composition, professional layout, space for typography, balanced color grading",
    artistic: "expressive brushwork, stylized illustration, bold shapes, creative textures",
    realistic: "photorealistic details, accurate lighting, natural textures, depth of field",
    fast: "simplified detail, strong silhouettes, punchy lighting",
  };

  const PRESET_PROMPTS: Record<string, string> = {
    none: "",
    Minimal: "minimal composition, ample negative space, subtle texture, soft shadows",
    Cyberpunk: "neon glow, futuristic vibes, high contrast rim light, holographic accents",
    Vintage: "retro print texture, muted palette, light film grain, aged paper look",
    minimal_bw: "high contrast black and white, minimal layout, clean typography space, subtle paper texture",
    grunge: "grunge texture, distressed look, rough edges, gritty film grain, dark moody palette",
    vaporwave: "pastel neon palette, vaporwave aesthetics, retro-futuristic gradients, lo-fi texture",
    y2k: "glossy highlights, chrome effects, bold shapes, early-2000s aesthetics, vibrant colors",
    swiss: "swiss graphic design, strong grid, bold typography area, minimal shapes, balanced whitespace",
    noir: "moody noir lighting, deep shadows, dramatic contrast, cinematic atmosphere",
    pastel: "soft pastel palette, gentle gradients, airy look, delicate texture",
    graffiti: "street art graffiti textures, bold spray patterns, urban gritty vibe",
    baroque: "ornate baroque motifs, rich textures, dramatic lighting, classical elegance",
    synthwave: "80s retro synthwave, magenta/teal neon, horizon grid, chrome highlights",
  };

  function buildPrompt(user: string, p: string, s: string) {
    const parts = [user.trim()];
    if (STYLE_PROMPTS[s]) parts.push(STYLE_PROMPTS[s]);
    if (PRESET_PROMPTS[p]) parts.push(PRESET_PROMPTS[p]);
    parts.push("album cover layout, space for clean typography, strong composition, high quality");
    return parts.filter(Boolean).join(", ");
  }

  function getDims(orient: string) {
    if (orient === "16:9") return { width: 1280, height: 720 };
    if (orient === "9:16") return { width: 720, height: 1280 };
    return { width: 1024, height: 1024 };
  }

  function styleToModel(key: string): string {
    switch (key) {
      case "artistic": return "dreamshaper-xl";
      case "realistic": return "realvis-xl";
      case "fast": return "sdxl-turbo";
      case "modern": default: return "sdxl-base";
    }
  }

  async function onGenerate() {
    if (!prompt.trim()) return;
    setLoading(true); setError(null);
    try {
      const dims = getDims(orientation);
      const payload = {
        prompt: buildPrompt(prompt, preset, style),
        model: styleToModel(style),
        width: dims.width,
        height: dims.height,
      };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Erreur de génération");
        throw new Error(msg || "Erreur de génération");
      }
      const data = await res.json();
      const url = data.url as string | undefined;
      if (url && bc) bc.postMessage({ type: "result", url, meta: payload });
    } catch (e: any) {
      setError(e.message || "Erreur inconnue");
      if (bc) bc.postMessage({ type: "error", message: e.message || "Erreur inconnue" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Announce presence (optional)
    bc?.postMessage({ type: "config-ready" });
    return () => bc?.close();
  }, [bc]);

  return (
    <div className="embed" style={{ width: "100%", height: "100%" }}>
      <style jsx global>{`
        html, body, .embed { height: 100%; }
        .embed .container { width: 100% !important; padding: 0 !important; margin: 0 !important; }
        .embed main { min-height: 100%; }
        /* Ultra-flat: no cards/borders/shadows, compact spacing */
        .embed .card { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; }
        .embed .grid { gap: 10px !important; }
        .embed .row { gap: 8px !important; }
        .embed label { font-size: 12px; color: #9ca3af; }
        .embed textarea, .embed select, .embed input[type="text"] { width: 100%; }
      `}</style>
      <main>
        <div className="container">
          <div className="card" style={{ margin: 0 }}>
            <div className="grid" style={{ rowGap: 10 }}>
              <div className="col">
                <label>Prompt</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="idée de cover" />
              </div>
              <div className="grid grid-2">
                <div className="col">
                  <label>Orientation</label>
                  <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                  </select>
                </div>
                <div className="col">
                  <label>Style</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)}>
                    <option value="modern">Moderne</option>
                    <option value="artistic">Artistique</option>
                    <option value="realistic">Réaliste</option>
                    <option value="fast">Rapide</option>
                  </select>
                </div>
              </div>
              <div className="col">
                <label>Preset</label>
                <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                  <option value="none">Aucun</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Cyberpunk">Cyberpunk</option>
                  <option value="Vintage">Vintage</option>
                  <option value="minimal_bw">Minimal Noir & Blanc</option>
                  <option value="grunge">Grunge</option>
                  <option value="vaporwave">Vaporwave</option>
                  <option value="y2k">Y2K</option>
                  <option value="swiss">Swiss Design</option>
                  <option value="noir">Noir</option>
                  <option value="pastel">Pastel</option>
                  <option value="graffiti">Graffiti</option>
                  <option value="baroque">Baroque</option>
                  <option value="synthwave">Synthwave</option>
                </select>
              </div>
              {error && <div className="error">{error}</div>}
              <div>
                <button className="btn" onClick={onGenerate} disabled={loading || !prompt.trim()}>
                  {loading ? "Génération..." : "Générer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
