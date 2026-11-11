import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { getPublicFormMeta } from "@/server/forms";

export const alt = `Formulário de contato · ${BRAND.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview do link no WhatsApp/Instagram/Facebook: título do formulário com a marca. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getPublicFormMeta(slug);
  const title = form?.title ?? "Fale com a gente";
  const description = form?.description ?? "Deixe seu contato e retornamos rapidinho.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 0% 0%, rgba(220,38,38,0.35), transparent 55%), #0b0b0b",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            {BRAND.monogram}
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
          <div style={{ fontSize: 30, color: "#a3a3a3", maxWidth: 950, lineHeight: 1.3 }}>{description.slice(0, 140)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#e5e5e5" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#25d366" }} />
          Resposta rápida pelo WhatsApp
        </div>
      </div>
    ),
    size,
  );
}
