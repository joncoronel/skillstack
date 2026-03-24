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

// -- Settings page (/settings/custom) --

const settingsTabValues = ["profile", "security", "billing"] as const;

export const loadSettingsSearchParams = createLoader({
  tab: parseAsStringLiteral(settingsTabValues).withDefault("profile"),
});
