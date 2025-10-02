"use client";

import { useEffect, useMemo, useState } from "react";

export default function EmbedResult() {
  const bc = useMemo(() => (typeof window !== "undefined" ? new BroadcastChannel("muzipics-bc") : null), []);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const data = ev.data || {};
      if (data.type === "result") {
        setImageUrl(data.url || null);
        setMeta(data.meta || null);
        setError(null);
      } else if (data.type === "error") {
        setError(data.message || "Erreur inconnue");
      }
    }
    bc?.addEventListener("message", onMsg as any);
    return () => {
      bc?.removeEventListener("message", onMsg as any);
      bc?.close();
    };
  }, [bc]);

  async function handleCopy() {
    try {
      if (!imageUrl) return;
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      // @ts-ignore ClipboardItem may not be typed in TS DOM lib
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

  async function handleDownload() {
    try {
      if (!imageUrl) return;
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `muzipics-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError("Impossible de télécharger l'image");
    }
  }

  return (
    <div className="embed" style={{ width: "100%", height: "100%" }}>
      <style jsx global>{`
        /* Fill and be transparent to let Webflow wrapper styles show through */
        html, body, #__next, .embed { height: 100%; margin: 0; background: transparent !important; }
        .embed main, .embed .container { height: 100%; width: 100% !important; padding: 0 !important; margin: 0 !important; background: transparent !important; }
        /* Ultra-flat: remove any chrome */
        .embed .card { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
        .embed .row { gap: 8px !important; }
        .embed .image-wrap { border-radius: 0 !important; overflow: visible !important; background: transparent !important; }
        .embed img { display: block; width: 100%; height: auto; }
      `}</style>
      <main>
        <div className="container">
          <div className="card" style={{ margin: 0 }}>
            {imageUrl ? (
              <>
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-secondary" onClick={handleCopy}>Copier</button>
                  <button className="btn" onClick={handleDownload}>Télécharger</button>
                </div>
                <div className="image-wrap">
                  <img src={imageUrl} alt="Résultat" style={{ width: "100%", display: "block" }} />
                </div>
              </>
            ) : (
              <div className="helper">En attente d'une génération...</div>
            )}
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
