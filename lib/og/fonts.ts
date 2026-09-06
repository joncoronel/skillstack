import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for `ImageResponse`. Satori needs the raw font bytes (ttf/otf/woff —
 * NOT woff2), so the brand faces are committed uncompressed under `assets/og/`:
 *   - Open Runde (400/500/600/700) — body + headings, the app's own sans.
 *   - Geist Mono (400) — machine strings.
 *
 * The sans is the app's face. It could not be while the app ran on SN Pro,
 * which is vendored only as a VARIABLE woff2; Open Runde ships static
 * instances, so `scripts/build-open-runde.py` cuts these straight from the
 * upstream release. Regenerate them with that script, not by hand.
 *
 * 700 is here but NOT in the browser bundle (see `app/layout.tsx`) — these
 * bytes are read server-side and never downloaded by a reader, so the weight
 * costs a card nothing. Satori has no font-matching fallback: a weight it
 * cannot find is substituted, not synthesised, so every weight a template
 * names has to be in this array.
 *
 * These render at the face's NATURAL size while the app serves it at
 * `size-adjust: 89.85%`. That is correct, not drift, and the two must not be
 * reconciled. Each canvas is calibrated against the face it replaced: the app's
 * ramp was tuned on SN Pro, whose lowercase fills 49% of the em against Open
 * Runde's 54.55%, so the browser face is scaled down to hit it. The card sizes
 * in `templates.tsx` were tuned on Geist, which fills 53% and sets at 100.0% of
 * Open Runde's advance width — near enough that the cards needed no correction
 * at all. Applying the app's 89.85% here would shrink every card by a tenth.
 *
 * The mono half stays on Geist Mono. `next/font/google` never writes a ttf to
 * disk, so matching the app's Google Sans Code here needs a source these files
 * do not have.
 *
 * `next.config.ts` lists `assets/og/**` in `outputFileTracingIncludes` so the
 * files travel with the serverless functions that render these images.
 *
 * The reads are kicked off once at module load (not on first render). Under
 * Cache Components, an `await readFile()` reached during a render counts as an
 * "async file system operation" and flips the route dynamic — which is what
 * made the otherwise-static section OG routes (no params, no data) land as `ƒ`
 * non-deterministically, depending on which one warmed this cache first in each
 * build worker. Initiating the reads at module scope keeps them out of the
 * render's dynamic-tracking, so those routes prerender as `○`. The single
 * shared promise is also reused across every render in the process.
 */
type OgFont = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal";
};

const assetPath = (file: string) => join(process.cwd(), "assets", "og", file);

const fontsPromise: Promise<OgFont[]> = (async () => {
  const [regular, medium, semibold, bold, mono] = await Promise.all([
    readFile(assetPath("OpenRunde-Regular.otf")),
    readFile(assetPath("OpenRunde-Medium.otf")),
    readFile(assetPath("OpenRunde-Semibold.otf")),
    readFile(assetPath("OpenRunde-Bold.otf")),
    readFile(assetPath("GeistMono-Regular.ttf")),
  ]);
  return [
    { name: "Open Runde", data: regular, weight: 400, style: "normal" },
    { name: "Open Runde", data: medium, weight: 500, style: "normal" },
    { name: "Open Runde", data: semibold, weight: 600, style: "normal" },
    { name: "Open Runde", data: bold, weight: 700, style: "normal" },
    { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
  ];
})();

export function loadOgFonts(): Promise<OgFont[]> {
  return fontsPromise;
}

/** Font family stacks for use in inline styles. */
export const FONT = {
  sans: "Open Runde",
  mono: "Geist Mono",
} as const;
