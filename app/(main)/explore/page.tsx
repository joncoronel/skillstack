import { ExploreContent } from "./explore-content";

export default function ExplorePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <header className="border-b pb-8">
        <p className="font-mono text-eyebrow uppercase tracking-eyebrow text-muted-foreground">
          Discover <span aria-hidden>&middot;</span> Bundles
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold tracking-tight leading-hero text-balance">
          Explore.
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          What the community is building, right now.
        </p>
      </header>

      <div className="mt-10 space-y-14">
        <ExploreContent />
      </div>
    </main>
  );
}
