import {
  TECHNOLOGY_CATEGORIES as CATEGORIES,
  buildFrontendTechnologies,
} from "@/convex/lib/technologyRegistry";

export interface Technology {
  id: string;
  name: string;
  keywords: string[];
  category: string;
}

export const TECHNOLOGY_CATEGORIES = CATEGORIES;

export const TECHNOLOGIES: Technology[] = buildFrontendTechnologies();
