import type { Metadata } from "next";

// next/font preloads from the MODULE GRAPH, not from what the CSS uses, so an
// unused import costs a real download on every route. Three faces have been
// dropped from here for that reason; check the CSS before adding one back.
import { Google_Sans_Code } from "next/font/google";

import localFont from "next/font/local";

import { OpenPanelComponent } from "@openpanel/nextjs";

import { Providers } from "./providers";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// metadataBase makes every relative OG/Twitter image URL absolute (required by
// crawlers). The origin itself lives in lib/site-url.ts, shared with the
// robots and sitemap routes — those emit text and XML, so nothing resolves
// relative URLs for them and they need the same value spelled out.

// Vendored, not fetched: Open Runde isn't on Google Fonts at all, and even if
// it were it has no entry in Next's metrics table, so `next/font/google`
// couldn't build a size-adjusted fallback. `next/font/local` measures the file.
//
// THREE FILES, NOT ONE. Open Runde ships static instances and no variable font,
// which is the whole shape of this config: each weight is a separate ~43 KB
// download and `next/font` preloads every one of them on every route. That is
// why 700 is absent — it had two call sites, both moved to `font-semibold`.
// Adding a weight here is a real cost, and using one that isn't here fails
// quietly: CSS matches the nearest available face rather than synthesising, so
// a `font-bold` would render at 600 and look almost right.
//
// The files are cut from the upstream release by `scripts/build-open-runde.py`,
// which also synthesises the `tnum` the family lacks — read its header before
// regenerating them. No italic, so emphasis is synthesised, as it always was.
// OFL 1.1 requires the licence to travel with them: `app/fonts/OFL-open-runde.txt`.
const openRunde = localFont({
  src: [
    { path: "./fonts/open-runde-400-latin.woff2", weight: "400" },
    { path: "./fonts/open-runde-500-latin.woff2", weight: "500" },
    { path: "./fonts/open-runde-600-latin.woff2", weight: "600" },
  ],
  variable: "--font-open-runde",
  display: "swap",
  // SERVED AT ITS NATURAL SIZE, and there is no `size-adjust` here on purpose.
  // `font-size` sizes the em box, not the letters, and each designer decides
  // how much of that box to fill: SN Pro filled 49% with lowercase, Open Runde
  // fills 54.55%. So the swap made every text call site render 11.3% larger and
  // 11.3% wider at an unchanged `text-sm`, and the ramp in globals.css — tuned
  // when 14px meant SN Pro's proportions — now lands about a tenth up from its
  // nominal numbers.
  //
  // That was measured, briefly corrected with `size-adjust: 89.85%`, and then
  // kept on purpose (Sep 2026): the larger face is the look we want, and it
  // pushes the 11px micro floor from a 5.4px x-height to 6.0px, which is more
  // legible rather than less. DESIGN.md §3 records it as the baseline.
  //
  // `scripts/build-open-runde.py --measure` prints the ratios if the family
  // ever moves again. Do not add `size-adjust` back without re-reading §3.
  //
  // `adjustFontFallback` is deliberately NOT set: its default for local fonts
  // is 'Arial', which makes Next measure these files and emit a metric-matched
  // Arial face ahead of everything below. That is the anti-CLS mechanism and it
  // stays in sync with the files automatically.
  //
  // Two attempts to beat that face have been made and both were removed. First
  // `adjustFontFallback: false` plus a hand-written `local("Inter")` family
  // ranked above it; then plain `"Open Runde", "Inter"` entries in the list
  // below. The reasoning behind both: Open Runde IS Inter with rounded corners
  // (upm 2816, x-height 1536, cap 2048, identical), so a reader's own Inter is
  // a perfect metric match.
  //
  // It does not pay, and the reason generalises: A FALLBACK IS MATCHED WITH
  // `local()`, so its only value is who already has it installed. Arial is on
  // effectively every Windows and macOS machine, and Linux fontconfig usually
  // aliases it to metric-compatible Liberation Sans. Inter is a webfont almost
  // nobody installs as a system font. So entries behind the generated face are
  // reached only when the woff2 has not loaded AND Arial resolves to nothing,
  // which is close to no one. Next also always inserts its generated fallback
  // directly after the real family, so ranking anything above it means turning
  // it off and hand-maintaining four font metrics with nothing to catch them
  // going stale. Don't.
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

// The app's mono face. Both options below are load-bearing. Don't add
// `display: "swap"`: it is the documented default and the @font-face carries it
// either way.
//
// `adjustFontFallback: false` — Google Sans Code has no row in Next's metrics
// table (`next/dist/server/capsize-font-metrics.json`), so the default `true`
// can only fail its lookup and log "Failed to find font override values" on
// every build and dev request. It yields no size-adjusted fallback either way.
//
// `fallback` — without it the loader emits a bare family name, so a failed load
// drops to the browser default, which is proportional. Measured at 20px: `iiiii`
// 27.8px vs `MMMMM` 88.9px bare, both 55.0px with the stack. That is every
// install command, file path and diff marker losing its columns.
const googleSansCode = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-google-sans-code",
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SkillBundle",
  description:
    "Discover, compare, and bundle AI coding assistant skills for your tech stack",
  // X/Twitter renders large-format cards; the generated twitter-image files
  // supply the actual artwork.
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${openRunde.variable} ${googleSansCode.variable} font-sans antialiased`}
      >
        <div className="root">
          <Providers>{children}</Providers>
        </div>
        {process.env.NODE_ENV === "production" && (
          <OpenPanelComponent
            clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!}
            trackScreenViews={true}
            apiUrl="/op/analytics"
            scriptUrl="/op1.js"
          />
        )}
      </body>
    </html>
  );
}
