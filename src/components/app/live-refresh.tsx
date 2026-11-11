"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Mantém a tela viva sem conexão longa (funciona em serverless): consulta um
 * carimbo de versão a cada `interval` ms e chama `router.refresh()` quando muda.
 * Pausa com a aba oculta e confere na hora ao voltar. O estado dos componentes
 * client (ex.: texto no composer) é preservado pelo refresh.
 */
/** Sem mudanças por um tempo, espaça as consultas até `maxInterval`; volta ao ritmo normal quando algo muda. */
export function LiveRefresh({
  lead,
  interval = 4000,
  maxInterval = 20000,
}: {
  lead?: string;
  interval?: number;
  maxInterval?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const url = lead ? `/api/inbox/version?lead=${encodeURIComponent(lead)}` : "/api/inbox/version";
    let last: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let delay = interval;

    const check = async () => {
      clearTimeout(timer);
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const { v } = (await res.json()) as { v: string };
            if (last !== null && v !== last) {
              router.refresh();
              delay = interval;
            } else {
              delay = Math.min(Math.round(delay * 1.5), maxInterval);
            }
            last = v;
          }
        } catch {
          // Offline ou servidor reiniciando: tenta de novo no próximo ciclo.
        }
      }
      if (!stopped) timer = setTimeout(check, delay);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      delay = interval;
      void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [lead, interval, maxInterval, router]);

  return null;
}
