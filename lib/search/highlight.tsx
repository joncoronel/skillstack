import * as React from "react";
import { NAME_TOKEN_SEPARATORS } from "@/lib/search/token-separators";

// Minimal HTML-entity decode for the text between/around Typesense's <mark>
// tags. Typesense escapes these five in field values; we render the parts as
// React text (never innerHTML), so we decode them back to their characters.
// One pass over the string (this runs per result row per keystroke).
const ENTITY_RE = /&(?:amp|lt|gt|#39|quot);/g;
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&#39;": "'",
  "&quot;": '"',
};
function decodeEntities(s: string): string {
  return s.replace(ENTITY_RE, (entity) => ENTITIES[entity]);
}

// Hoisted — see renderHighlight below. (`split` never uses lastIndex, and
// `replace` with /g resets it, so sharing these across calls is safe.)
// The separator class is built from the collection schema's own
// token_separators so the bridge can't drift from what Typesense splits on.
const BRIDGE_SEPARATORS_RE = new RegExp(
  `</mark>([${NAME_TOKEN_SEPARATORS.map((s) => `\\${s}`).join("")}]+)<mark>`,
  "g",
);
const MARK_TAG_RE = /<\/?mark>/;

/**
 * Render Typesense's highlight `value` — the field text with matched tokens
 * wrapped in `<mark>…</mark>` — as React nodes. We split on the mark tags and
 * render each segment as a plain text child, so any other markup in the value
 * is shown literally (React escapes it); nothing is passed to innerHTML.
 *
 * Using the engine's highlight (rather than re-marking the query client-side)
 * means matches are fuzzy-aware: a typo'd query like "postgress" still marks the
 * corrected token ("neon-<mark>postgres</mark>"), and prefixes mark exactly the
 * matched span ("<mark>vercel</mark>-<mark>compo</mark>sition-patterns").
 */
export function renderHighlight(value: string): React.ReactNode {
  // Bridge marks separated by only separator chars: Typesense marks tokens but
  // not the `-`/`_`/`.`/`/` between them, so "vercel-react-best" comes back as
  // three marks with bare hyphens between. Absorb those separators into a single
  // run so a contiguous match highlights as one span, not blue-white-blue.
  const bridged = value.replace(BRIDGE_SEPARATORS_RE, "$1");

  // Typesense injects only balanced, non-nested <mark>/</mark>. Splitting on
  // both tags yields alternating segments: even index = unmarked, odd = marked.
  const segments = bridged.split(MARK_TAG_RE);
  return segments.map((segment, i) => {
    const text = decodeEntities(segment);
    if (!text) return null;
    return i % 2 === 1 ? (
      // A tint, not a recolour. This was `font-bold text-primary`, which read as
      // two cues but is one: both call sites already wrap it in `font-semibold`,
      // so the weight step only ever came from the 700 face, and for a while
      // this branch did not ship one. That left `text-primary` alone, and colour
      // alone is not a cue. It also measured 3.95:1 on the row surface in both
      // themes, under the 4.5:1 floor for 14px, so the match was harder to read
      // than the text around it.
      //
      // The box is the cue now, and `text-inherit` keeps the match at whatever
      // contrast its neighbours already pass. Weight is deliberately not used:
      // it depends on the parent never being 700 itself, which is what broke.
      <mark key={i} className="rounded-[3px] bg-primary/20 px-0.5 text-inherit">
        {text}
      </mark>
    ) : (
      <React.Fragment key={i}>{text}</React.Fragment>
    );
  });
}
