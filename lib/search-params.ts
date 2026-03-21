import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs";

// -- Home page (/) parsers --

export const techParser = parseAsArrayOf(parseAsString).withDefault([]);

const tabValues = ["browse", "search"] as const;
export type TabValue = (typeof tabValues)[number];
export const tabParser = parseAsStringLiteral(tabValues).withDefault("browse");

export const searchQueryParser = parseAsString.withDefault("");

// -- Explore page (/explore) parsers --

export const exploreQueryParser = parseAsString.withDefault("");

// -- Settings page (/settings/custom) parsers --

const settingsTabValues = ["profile", "security", "billing"] as const;
export type SettingsTabValue = (typeof settingsTabValues)[number];
export const settingsTabParser =
  parseAsStringLiteral(settingsTabValues).withDefault("profile");
