import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { db, schema } from "@/db";
import { cn } from "@/lib/utils";
import { PublicLeadForm } from "./public-form";

export const metadata: Metadata = { title: "Fale com a gente", robots: { index: false } };

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

async function FormLoader({ params, searchParams }: Pick<PageProps<"/f/[slug]">, "params" | "searchParams">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const form = await db
    .select()
    .from(schema.forms)
    .where(and(eq(schema.forms.slug, slug), eq(schema.forms.active, true)))
    .get();
  if (!form) notFound();

  const utm = Object.fromEntries(
    UTM_KEYS.map((k) => [k, typeof sp[k] === "string" ? (sp[k] as string).slice(0, 100) : ""]),
  ) as Record<(typeof UTM_KEYS)[number], string>;

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
      }}
      utm={utm}
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
        {!embedded ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">Seus dados são usados apenas para retornarmos o contato.</p>
        ) : null}
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
