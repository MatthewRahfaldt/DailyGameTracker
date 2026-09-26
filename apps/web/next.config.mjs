/** @type {import('next').NextConfig} */
const nextConfig = {
  // Let Next.js transpile the workspace packages instead of requiring them to be pre-built.
  transpilePackages: ["@dgt/types", "@dgt/parsers", "@dgt/stats"],

  // Security response headers beyond what Vercel already sends automatically. Vercel applies
  // HSTS (Strict-Transport-Security) by default on both *.vercel.app and custom domains
  // (https://vercel.com/docs/cdn-security) — everything below is opt-in, so it doesn't happen
  // unless we set it here. Applied to every route via the catch-all "/:path*" source.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops browsers from "sniffing"/guessing a response's content type from its body
          // instead of trusting the real Content-Type — closes off a class of MIME-confusion
          // attacks (e.g. a file served as plain text but executed as script because a browser
          // guessed otherwise).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing here is meant to be embedded in another site's <iframe>. DENY blocks that
          // outright, which is what prevents clickjacking (a transparent iframe of this app laid
          // over a decoy page to trick clicks into doing something on this site instead).
          { key: "X-Frame-Options", value: "DENY" },
          // Send the full URL only on same-origin navigations/requests; cross-origin, send just
          // the origin (no path or query string). Keeps things like an invite-code-bearing path
          // from leaking to a third-party site via the Referer header on an outbound link.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
