import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

// -- Home page (/) --

const tabValues = ["browse", "search"] as const;

export const loadHomeSearchParams = createLoader({
  q: parseAsString.withDefault(""),
  tab: parseAsStringLiteral(tabValues).withDefault("browse"),
  tech: parseAsArrayOf(parseAsString).withDefault([]),
});

// -- Explore page (/explore) --

export const loadExploreSearchParams = createLoader({
  q: parseAsString.withDefault(""),
});
