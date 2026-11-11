import { NextResponse, type NextRequest } from "next/server";
import { isActiveFormSlug } from "@/server/forms";

/**
 * Checagem otimista: só olha se o cookie existe. A validação real da sessão
 * acontece na DAL (src/server/auth/dal.ts), perto dos dados.
 */
const SESSION_COOKIE = "cl_session";
const PUBLIC_PREFIXES = ["/login", "/f/", "/form-indisponivel", "/privacidade", "/esqueci-senha", "/redefinir-senha", "/api/public", "/api/webhooks", "/api/cron"];

const FORM_PAGE = /^\/f\/([^/]+)\/?$/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // A página do formulário faz streaming; notFound() lá dentro sairia com status 200.
  const formSlug = request.method === "GET" ? FORM_PAGE.exec(pathname)?.[1] : undefined;
  if (formSlug && !(await isActiveFormSlug(decodeURIComponent(formSlug)))) {
    return NextResponse.rewrite(new URL("/form-indisponivel", request.url), { status: 404 });
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)"],
};
