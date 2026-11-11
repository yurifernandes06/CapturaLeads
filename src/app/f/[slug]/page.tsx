import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { db, schema } from "@/db";
import { pickAttribution, safeUrl } from "@/lib/attribution";
import { cn } from "@/lib/utils";
import { turnstileSiteKey } from "@/server/turnstile";
import { PublicLeadForm } from "./public-form";
import { FormUnavailable } from "./unavailable";

export const metadata: Metadata = { title: "Fale com a gente", robots: { index: false } };

async function FormLoader({ params, searchParams }: Pick<PageProps<"/f/[slug]">, "params" | "searchParams">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const form = await db
    .select()
    .from(schema.forms)
    .where(and(eq(schema.forms.slug, slug), eq(schema.forms.active, true)))
    .get();
  // Dentro do Suspense o notFound() cairia no 404 global do painel; mostramos a mensagem pública aqui.
  if (!form) return <FormUnavailable />;

  // UTMs + clique do anúncio; no embed, o snippet repassa a página (lp) e o referrer (ref) do site-pai.
  const attribution: Record<string, string> = { ...pickAttribution(sp) };
  const lp = safeUrl(sp.lp);
  const ref = safeUrl(sp.ref);
  if (lp) attribution.landing_page = lp;
  if (ref) attribution.referrer = ref;

  return (
    <PublicLeadForm
      form={{
        slug: form.slug,
        title: form.title,
        description: form.description,
        buttonText: form.buttonText,
        successMessage: form.successMessage,
        askEmail: form.askEmail,
        askCompany: form.askCompany,
        whatsappNumber: form.whatsappNumber,
      }}
      attribution={attribution}
      turnstileSiteKey={turnstileSiteKey()}
    />
  );
}

async function Shell({ searchParams, children }: { searchParams: PageProps<"/f/[slug]">["searchParams"]; children: React.ReactNode }) {
  const { embed } = await searchParams;
  const embedded = embed === "1";
  return (
    <main
      className={cn(
        "relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10",
        !embedded && "glow-red",
        embedded && "bg-transparent py-4",
      )}
    >
      {!embedded ? (
        <div aria-hidden className="absolute inset-0 grid-lines [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      ) : null}
      <div className="relative w-full max-w-md">
        {!embedded ? <Logo className="mb-8" /> : null}
        {children}
      </div>
    </main>
  );
}

export default function PublicFormPage(props: PageProps<"/f/[slug]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Shell searchParams={props.searchParams}>
        <FormLoader params={props.params} searchParams={props.searchParams} />
      </Shell>
    </Suspense>
  );
}

function FormSkeleton() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="grid w-full max-w-md gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </main>
  );
}
