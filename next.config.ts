import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// HTTPS garantido só no deploy (Vercel); localmente `next start` roda em http.
const isHttps = Boolean(process.env.VERCEL);

/** CSP sem nonce (mantém páginas estáticas); `frame-ancestors` varia entre painel e formulário público. */
/** Captcha do formulário público (Cloudflare Turnstile): script + iframe do widget. */
const TURNSTILE = "https://challenges.cloudflare.com";

function csp(frameAncestors: string, thirdParty: string[] = []) {
  const extra = thirdParty.length ? ` ${thirdParty.join(" ")}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${extra}`,
    `frame-src 'self'${extra}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self'${extra}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Painel e APIs: nunca dentro de iframe (clickjacking).
        source: "/((?!f/).*)",
        headers: [...baseHeaders, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: csp("'none'") }],
      },
      {
        // Formulário público: pode ser incorporado em qualquer site (snippet de embed).
        source: "/f/:path*",
        headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp("*", [TURNSTILE]) }],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
