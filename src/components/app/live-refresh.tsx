"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Mantém a tela viva sem conexão longa (funciona em serverless): consulta um
 * carimbo de versão a cada `interval` ms e chama `router.refresh()` quando muda.
 * Pausa com a aba oculta e confere na hora ao voltar. O estado dos componentes
 * client (ex.: texto no composer) é preservado pelo refresh.
 */
export function LiveRefresh({ lead, interval = 4000 }: { lead?: string; interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    const url = lead ? `/api/inbox/version?lead=${encodeURIComponent(lead)}` : "/api/inbox/version";
    let last: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const check = async () => {
      clearTimeout(timer);
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const { v } = (await res.json()) as { v: string };
            if (last !== null && v !== last) router.refresh();
            last = v;
          }
        } catch {
          // Offline ou servidor reiniciando: tenta de novo no próximo ciclo.
        }
      }
      if (!stopped) timer = setTimeout(check, interval);
    };

    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [lead, interval, router]);

  return null;
}
