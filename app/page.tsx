"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Simple controls
  const [style, setStyle] = useState<string>("modern"); // maps to model keys
  const [preset, setPreset] = useState<string>("none");
  const [orientation, setOrientation] = useState<string>("1:1");
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">("png");
  const [exportQuality, setExportQuality] = useState<number>(0.92);

  // Local history
  type HistoryItem = {
    id: string;
    url: string;
    prompt: string;
    style: string;
    size: string;
    createdAt: number;
  };
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("muzipics-history-v1");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("muzipics-history-v1", JSON.stringify(history.slice(0, 24)));
    } catch {}
  }, [history]);

  function styleToModel(key: string): string {
    switch (key) {
      case "artistic":
        return "dreamshaper-xl"; // Lykon/dreamshaper-xl-v2
      case "realistic":
        return "realvis-xl"; // SG161222/RealVisXL_V4.0
      case "fast":
        return "sdxl-turbo"; // stabilityai/sdxl-turbo
      case "modern":
      default:
        return "sdxl-base"; // stabilityai/stable-diffusion-xl-base-1.0
    }
  }

  // Style and prompt presets
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

  function buildPrompt(userPrompt: string, presetKey: string, styleKey: string): string {
    const parts = [userPrompt.trim()];
    const styleAdd = STYLE_PROMPTS[styleKey] || "";
    const presetAdd = PRESET_PROMPTS[presetKey] || "";
    if (styleAdd) parts.push(styleAdd);
    if (presetAdd) parts.push(presetAdd);
    // album cover guidance
    parts.push("album cover layout, space for clean typography, strong composition, high quality");
    return parts.filter(Boolean).join(", ");
  }

  function getDims(orient: string): { width: number; height: number } {
    // Use safe fixed sizes compatible with HF limits; API re-clamps/rounds
    if (orient === "16:9") return { width: 1280, height: 720 };
    if (orient === "9:16") return { width: 720, height: 1280 };
    return { width: 1024, height: 1024 };
  }

  const onGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: (() => {
          const dims = getDims(orientation);
          const finalPrompt = buildPrompt(prompt, preset, style);
          const payload = {
            prompt: finalPrompt,
            model: styleToModel(style),
            width: dims.width,
            height: dims.height,
          };
          return JSON.stringify(payload);
        })(),
      });
      if (!res.ok) {
        let msg = "";
        try { msg = await res.text(); } catch {}
        throw new Error(msg || "Erreur de génération");
      }
      const data = await res.json();
      setImageUrl(data.url || null);
      if (data.url) {
        const item: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: data.url,
          prompt: buildPrompt(prompt, preset, style),
          style,
          size: `${orientation}`,
          createdAt: Date.now(),
        };
        setHistory((h) => [item, ...h].slice(0, 24));
      }
    } catch (e: any) {
      setError(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  async function handleDownload() {
    try {
      if (!imageUrl) return;
      // If exporting as PNG, save directly; else convert via canvas
      if (exportFormat === "png") {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `muzipics-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // Load image from data URL
      const img = new Image();
      img.src = imageUrl;
      await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non supporté");
      ctx.drawImage(img, 0, 0);

      const mime = exportFormat === "jpg" ? "image/jpeg" : "image/webp";
      const url = canvas.toDataURL(mime, exportQuality);
      const a = document.createElement("a");
      a.href = url;
      const ext = exportFormat === "jpg" ? "jpg" : "webp";
      a.download = `muzipics-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError("Impossible de télécharger l'image");
    }
  }

  async function handleCopy() {
    try {
      if (!imageUrl) return;
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      // @ts-ignore ClipboardItem may not be typed
      if (navigator.clipboard && window.ClipboardItem) {
        // @ts-ignore
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(imageUrl);
      }
    } catch {
      setError("Impossible de copier l'image");
    }
  }

  return (
    <main>
      <div className="container">
        <div className="grid" style={{ gap: 24, gridTemplateColumns: "1.1fr 1fr" }}>
          {/* Left: Controls */}
          <div className="card">
            <div className="grid" style={{ rowGap: 14 }}>
              <div>
                <div className="title">Muzipics — Générateur</div>
                <div className="subtitle">Simple et efficace. Décrivez votre cover, choisissez la taille et le style.</div>
              </div>

              <div className="col">
                <label>Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="album cover, [genre], [ambiance], cinematic lighting, composition forte, espace pour typographie"
                />
                <div className="helper">Astuce: précisez genre, ambiance, palette, texture, cadrage, espace pour la typo.</div>
              </div>

              <div className="grid grid-2">
                <div className="col">
                  <label>Orientation</label>
                  <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                    <option value="1:1">1:1 (Carré)</option>
                    <option value="16:9">16:9 (Paysage)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                  </select>
                </div>
                <div className="col">
                  <label>Style graphique</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)}>
                    <option value="modern">Moderne (équilibré)</option>
                    <option value="artistic">Artistique</option>
                    <option value="realistic">Réaliste</option>
                    <option value="fast">Rapide</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
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
              </div>

              <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                <div className="helper">HF gratuit: génération parfois lente. Réessaie si le modèle charge.</div>
                <div className="row">
                  <button className="btn btn-secondary" onClick={() => {
                    setPrompt("");
                    setImageUrl(null);
                    setError(null);
                  }}>Réinitialiser</button>
                  <button className="btn" onClick={onGenerate} disabled={loading || !prompt.trim()}>
                    {loading ? "Génération..." : "Générer"}
                  </button>
                </div>
              </div>

              {error && <div className="error">{error}</div>}
            </div>
          </div>

          {/* Right: Result */}
          <div className="grid" style={{ gap: 24 }}>
            <div className="card" style={{ alignSelf: "start" }}>
              {imageUrl ? (
                <>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn-secondary" onClick={handleCopy}>Copier</button>
                    <div className="row" style={{ gap: 8 }}>
                      <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}>
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="webp">WEBP</option>
                      </select>
                      {exportFormat !== "png" && (
                        <div className="row" style={{ gap: 8 }}>
                          <label>Qualité</label>
                          <input type="range" min={0.5} max={1} step={0.01} value={exportQuality}
                                 onChange={(e) => setExportQuality(Number(e.target.value))} />
                        </div>
                      )}
                      <button className="btn" onClick={handleDownload}>Télécharger</button>
                    </div>
                  </div>
                  <div className="image-wrap">
                    <img src={imageUrl} alt="Résultat" style={{ width: "100%", display: "block" }} />
                  </div>
                </>
              ) : (
                <div className="helper">Le résultat apparaîtra ici après la génération.</div>
              )}
            </div>

            <div className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="title" style={{ fontSize: 18 }}>Historique</div>
                {history.length > 0 && (
                  <button className="btn btn-secondary" onClick={() => setHistory([])}>Vider</button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="helper">Aucune génération pour l'instant.</div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 12 }}>
                  {history.map((item) => (
                    <button key={item.id} className="btn btn-secondary" style={{ padding: 0, borderRadius: 12, overflow: "hidden" }}
                            onClick={() => setImageUrl(item.url)} title={`${new Date(item.createdAt).toLocaleString()} — ${item.style} — ${item.size}`}>
                      <img src={item.url} alt="thumb" style={{ width: "100%", display: "block" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
