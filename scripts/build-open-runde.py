"""
Builds the vendored Open Runde font files from an upstream release.

Open Runde (https://github.com/lauridskern/open-runde) ships four static faces
and no variable font, so the app cannot just point `next/font/local` at a single
file the way SN Pro did. This script cuts the two sets of instances the app
needs, and is the reason those binaries are reproducible rather than a hand-run
step nobody can repeat:

  app/fonts/open-runde-{400,500,600,700}-latin.woff2
      The browser faces, loaded by `app/layout.tsx`. Subsetted to the Google
      `latin` range, the same range SN Pro shipped: 151 KB -> 26 KB per face,
      so 606 KB -> 106 KB across the four, and `next/font` preloads every one
      of them on every route.

      This step has no equivalent in the Next.js docs because it is not a
      Next.js concern: Next serves whatever woff2 it is pointed at and never
      modifies it. `next/font/google` appears to do this for free via its
      `subsets` option, but that only picks between files Google already
      subsetted and hosts. A local font has no such option, so the subsetting
      is ours to do - here.

  assets/og/OpenRunde-{Regular,Medium,Semibold,Bold}.otf
      The `ImageResponse` faces for `lib/og/`. Satori reads raw ttf/otf/woff
      and cannot read woff2, which is why these stay uncompressed. They carry a
      wider range than the browser faces because OG cards render names we do
      not control.

The browser faces get a synthesized `tnum` feature - see `add_tabular_figures`
below. The OG faces do not: Satori applies no OpenType feature settings, so a
`tnum` there would be a feature with no way to turn it on.

`--measure` writes no files. It prints how this family sets against the ramp's
original calibration - see `measure` and CALIBRATION_X_HEIGHT below.

Run with:
  python scripts/build-open-runde.py path/to/open-runde-release
  python scripts/build-open-runde.py path/to/open-runde-release --measure

where the argument is an extracted copy of
https://github.com/lauridskern/open-runde/releases/latest (the directory holding
`src/desktop/*.otf` and `LICENSE.txt`). Install the pinned build deps first:
`pip install -r scripts/requirements.txt`. Those versions change the output
bytes, which is why they are pinned and recorded.

Every run writes `app/fonts/SOURCES.txt`: the release it read, the two library
versions, and a sha256 per output. Commit it with the binaries.
"""

import hashlib
import shutil
import sys
from datetime import date
from pathlib import Path

import brotli
import fontTools
from fontTools import subset
from fontTools.otlLib.builder import buildSinglePos, buildValue
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot

ROOT = Path(__file__).resolve().parent.parent

# The Google `latin` subset, verbatim. SN Pro was vendored at this exact range,
# so the swap does not quietly change which characters render from the webfont
# and which fall through to the system stack.
WEB_UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,"
    "U+2212,U+2215,U+FEFF,U+FFFD"
)

# Wider, because OG cards set skill and owner names straight from the catalog,
# and a card is the one place a name renders with no browser font fallback
# behind it. Greek and Cyrillic are in here because the outgoing Geist faces
# carried them and dropping them would have narrowed what a card can render.
OG_UNICODES = (
    "U+0000-024F,U+0259,U+02B0-02FF,U+0300-036F,U+0370-03FF,U+0400-052F,"
    "U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20A0-20BF,U+2100-214F,"
    "U+2190-21FF,U+2200-22FF,U+2460-24FF,U+25A0-25FF,U+2600-26FF,"
    "U+2770-277F,U+FB00-FB06,U+FEFF,U+FFFD"
)

FACES = ["Regular", "Medium", "Semibold", "Bold"]

# All four. `next/font` preloads every file in a loader's `src`, so a face costs
# its ~26 KB on the first paint of every route whether or not that route sets
# it, which is why this list is worth thinking about before adding to.
#
# Bold was cut at first and then put back. The cut was made on a measured 43 KB
# per face, but that number came from output this script was writing as
# uncompressed OpenType under a `.woff2` name (see `build`). At the real 26 KB
# the trade changed: the reason to carry 700 is that without it `font-bold` is
# a normal Tailwind utility that matches 600 and looks almost right, and a
# stack where that fails silently costs more than the download.
WEB_FACES = {"Regular": 400, "Medium": 500, "Semibold": 600, "Bold": 700}


def add_tabular_figures(font: TTFont) -> None:
    """Synthesize a `tnum` feature by widening the digits through GPOS.

    Open Runde's digits are proportional (a `1` is 18% narrower than a `0`) and
    upstream ships no `tnum`, so every `tabular-nums` in the app - stat cells,
    the compare table, the change feed, the dev dashboard - would silently stop
    aligning. SN Pro had `tnum`, so this keeps those call sites honest rather
    than leaving them as lies.

    Done as a GPOS single-positioning lookup (a per-digit advance delta, plus
    half of it as placement to re-center the glyph in its wider slot) rather
    than as GSUB alternates, because that needs no new outlines and leaves the
    proportional digits as the default. Appended to the existing GPOS so the
    font's own `kern` survives: feaLib's `addOpenTypeFeatures` would rebuild the
    table from scratch and drop it.
    """
    cmap = font.getBestCmap()
    widths = {cmap[0x30 + i]: font["hmtx"][cmap[0x30 + i]][0] for i in range(10)}
    target = max(widths.values())

    mapping = {}
    for glyph, width in widths.items():
        delta = target - width
        if delta:
            mapping[glyph] = buildValue(
                {"XPlacement": round(delta / 2), "XAdvance": delta}
            )
    if not mapping:
        return  # Already tabular; nothing to say.

    lookup = ot.Lookup()
    lookup.LookupType = 1
    lookup.LookupFlag = 0
    lookup.SubTable = buildSinglePos(mapping, font.getReverseGlyphMap())
    lookup.SubTableCount = len(lookup.SubTable)

    gpos = font["GPOS"].table
    lookup_index = len(gpos.LookupList.Lookup)
    gpos.LookupList.Lookup.append(lookup)
    gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)

    feature = ot.Feature()
    feature.FeatureParams = None
    feature.LookupListIndex = [lookup_index]
    feature.LookupCount = 1
    record = ot.FeatureRecord()
    record.FeatureTag = "tnum"
    record.Feature = feature
    # FeatureRecords must stay sorted by tag; upstream's only feature is `kern`.
    gpos.FeatureList.FeatureRecord.append(record)
    gpos.FeatureList.FeatureCount = len(gpos.FeatureList.FeatureRecord)
    feature_index = len(gpos.FeatureList.FeatureRecord) - 1

    for script in gpos.ScriptList.ScriptRecord:
        systems = [ls.LangSys for ls in script.Script.LangSysRecord]
        if script.Script.DefaultLangSys is not None:
            systems.append(script.Script.DefaultLangSys)
        for system in systems:
            system.FeatureIndex.append(feature_index)
            system.FeatureCount = len(system.FeatureIndex)


def build(source: Path, unicodes: str, flavor, out: Path, tabular: bool) -> None:
    font = TTFont(source)
    if tabular:
        add_tabular_figures(font)

    options = subset.Options()
    # `tnum` is not in fontTools' default keep-list, so the feature added above
    # would be pruned straight back out.
    if tabular:
        options.layout_features += ["tnum"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=subset.parse_unicodes(unicodes))
    subsetter.subset(font)

    out.parent.mkdir(parents=True, exist_ok=True)
    # On the FONT, not on `subset.Options`. Options.flavor is only read by
    # fontTools' own CLI wrapper, so setting it there and calling `font.save()`
    # writes the source flavor and silently ships uncompressed OpenType under a
    # `.woff2` name. That shipped once: the first three faces went out as
    # `OTTO`, about 2x their compressed size, and browsers sniffed the bytes and
    # rendered them, so nothing failed. Check the magic is `wOF2`, not the
    # extension.
    font.flavor = flavor
    font.save(out)
    size = out.stat().st_size / 1024
    print(f"  {out.relative_to(ROOT).as_posix():<48} {size:6.1f} KB")


# The proportions the app's type ramp was originally drawn against, measured off
# SN Pro (the outgoing face) as fractions of the em. The 14px body, the 11px
# micro floor, the display clamps and the 45-75ch measure were all tuned while
# text rendered at these ratios.
#
# They are kept as a REFERENCE POINT, not as a target. Open Runde ships at its
# natural size and therefore about a tenth above these numbers, which was
# measured and then chosen (DESIGN.md §3). What they are still good for is
# answering "how far has the setting drifted from what the ramp assumes", which
# is the question to ask before adding a type step or swapping the family again.
CALIBRATION_X_HEIGHT = 0.4900
CALIBRATION_CAP = 0.6760
CALIBRATION_ADVANCE = 0.4797


def measure(source: Path) -> None:
    """Print how this family sets against the ramp's original calibration.

    Run as `python scripts/build-open-runde.py <release> --measure`. Nothing
    consumes the output; it exists so the Optical-Mass Rule in DESIGN.md §3 has
    a command behind it rather than a memory. The `size-adjust` column is what
    WOULD cancel the difference - the app deliberately does not apply it, so
    treat those as the size of the drift, not as a setting to go install.
    """
    from fontTools.pens.boundsPen import BoundsPen

    font = TTFont(source / "src" / "desktop" / "OpenRunde-Regular.otf")
    upm = font["head"].unitsPerEm
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()

    def top(char: str) -> float:
        pen = BoundsPen(glyphs)
        glyphs[cmap[ord(char)]].draw(pen)
        return pen.bounds[3] / upm

    lowercase = "abcdefghijklmnopqrstuvwxyz"
    advance = sum(font["hmtx"][cmap[ord(c)]][0] for c in lowercase) / len(lowercase) / upm

    print(f"Open Runde   x-height {top('x') * 100:5.2f}%  cap {top('H') * 100:5.2f}%  advance {advance * 100:5.2f}%")
    print(f"Calibration  x-height {CALIBRATION_X_HEIGHT * 100:5.2f}%  cap {CALIBRATION_CAP * 100:5.2f}%  advance {CALIBRATION_ADVANCE * 100:5.2f}%")
    print()
    print(f"  size-adjust to match x-height: {CALIBRATION_X_HEIGHT / top('x') * 100:6.2f}%")
    print(f"  size-adjust to match advance : {CALIBRATION_ADVANCE / advance * 100:6.2f}%")
    print(f"  size-adjust to match cap     : {CALIBRATION_CAP / top('H') * 100:6.2f}%")
    print()
    print("These are NOT applied. The app serves Open Runde at its natural size, so it")
    print("sets roughly a tenth above what the ramp's rem values imply - measured, then")
    print("chosen (DESIGN.md 3). Read them as the size of that gap.")


def write_sources(source: Path, outputs: list[Path]) -> None:
    """Record what produced the committed binaries.

    The header calls these reproducible, which is only true if the inputs are
    written down. The upstream release, fontTools and brotli all change the
    output bytes, so a rerun against a different one reshapes the app's type
    with no signal beyond a changed binary. This is the signal.
    """
    lines = [
        "Provenance for the vendored Open Runde binaries.",
        "Written by scripts/build-open-runde.py. Do not edit by hand.",
        "",
        f"built:      {date.today().isoformat()}",
        f"source:     {source.name}  (https://github.com/lauridskern/open-runde)",
        f"fonttools:  {fontTools.version}",
        f"brotli:     {getattr(brotli, '__version__', 'unknown')}",
        "",
        "sha256 of each output:",
    ]
    for out in outputs:
        digest = hashlib.sha256(out.read_bytes()).hexdigest()
        lines.append(f"  {digest}  {out.relative_to(ROOT).as_posix()}")

    target = ROOT / "app" / "fonts" / "SOURCES.txt"
    body = "\n".join(lines) + "\n"
    target.write_text(body, encoding="utf-8", newline="\n")
    print(f"  {target.relative_to(ROOT).as_posix()}")


def main() -> None:
    args = sys.argv[1:]
    measure_only = "--measure" in args
    args = [a for a in args if a != "--measure"]
    if len(args) != 1:
        sys.exit(__doc__)
    source = Path(args[0]).resolve()
    desktop = source / "src" / "desktop"
    if not desktop.is_dir():
        sys.exit(f"No src/desktop in {source} - is that an Open Runde release?")

    if measure_only:
        measure(source)
        return

    outputs: list[Path] = []

    print("Browser faces (latin subset, woff2):")
    for face, weight in WEB_FACES.items():
        outputs.append(
            ROOT / "app" / "fonts" / f"open-runde-{weight}-latin.woff2"
        )
        build(
            desktop / f"OpenRunde-{face}.otf",
            WEB_UNICODES,
            "woff2",
            ROOT / "app" / "fonts" / f"open-runde-{weight}-latin.woff2",
            tabular=True,
        )

    print("\nImageResponse faces (wide subset, otf):")
    for face in FACES:
        outputs.append(ROOT / "assets" / "og" / f"OpenRunde-{face}.otf")
        build(
            desktop / f"OpenRunde-{face}.otf",
            OG_UNICODES,
            None,
            ROOT / "assets" / "og" / f"OpenRunde-{face}.otf",
            tabular=False,
        )

    # OFL 1.1 requires the licence to travel with the fonts.
    shutil.copyfile(
        source / "LICENSE.txt", ROOT / "app" / "fonts" / "OFL-open-runde.txt"
    )
    print("\n  app/fonts/OFL-open-runde.txt")

    write_sources(source, outputs)



if __name__ == "__main__":
    main()
