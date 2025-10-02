"use client";

import HomePage from "../page";

export default function EmbedPage() {
  return (
    <div className="embed" style={{ width: "100%", height: "100%" }}>
      <style jsx global>{`
        /* Make the app fill the parent without inner padding */
        html, body, .embed { height: 100%; }
        .embed .container { width: 100% !important; padding: 0 !important; margin: 0 !important; }
        .embed main { min-height: 100%; }
      `}</style>
      <HomePage />
    </div>
  );
}
