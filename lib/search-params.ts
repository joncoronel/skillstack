import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs";

// -- Home page (/) parsers --

export const techParser = parseAsArrayOf(parseAsString).withDefault([]);

const tabValues = ["browse", "search"] as const;
export type TabValue = (typeof tabValues)[number];
export const tabParser = parseAsStringLiteral(tabValues).withDefault("browse");

export const searchQueryParser = parseAsString.withDefault("");

// -- Explore page (/explore) parsers --

const sortValues = ["recent", "popular"] as const;
export type SortMode = (typeof sortValues)[number];
export const sortParser = parseAsStringLiteral(sortValues).withDefault(
  "recent",
);
