import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Muzipics - Test Generator",
  description: "Single-page test to generate an image from a prompt",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
