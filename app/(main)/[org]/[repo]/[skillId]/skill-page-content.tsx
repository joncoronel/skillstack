import Link from "next/link";
import Markdown from "react-markdown";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { CopyButton } from "@/components/ui/cubby-ui/copy-button/copy-button";
import { TECHNOLOGIES } from "@/lib/technologies";

const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

interface Skill {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
}

interface SkillPageContentProps {
  skill: Skill;
  content: string | null;
}

export function SkillPageContent({ skill, content }: SkillPageContentProps) {
  const installCommand = `npx skills add ${skill.source} --skill ${skill.skillId}`;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <span>{skill.source}</span>
        <span>/</span>
        <span className="text-foreground">{skill.skillId}</span>
      </nav>

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight mb-3">{skill.name}</h1>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="tabular-nums">
          {formatInstalls(skill.installs)} installs
        </span>
        <span>·</span>
        <a
          href={`https://github.com/${skill.source}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors hover:underline"
        >
          {skill.source}
        </a>
      </div>

      {/* Technologies */}
      {skill.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {skill.technologies.map((techId) => (
            <Badge
              key={techId}
              variant="secondary"
              className="text-xs px-2 py-0.5"
            >
              {techMap.get(techId) ?? techId}
            </Badge>
          ))}
        </div>
      )}

      {/* Install command */}
      <div className="group relative rounded-xl bg-muted mb-8">
        <pre className="overflow-x-auto px-4 py-3 text-sm font-mono pr-16">
          {installCommand}
        </pre>
        <div className="absolute top-1.5 right-1.5">
          <CopyButton content={installCommand} />
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {skill.description && (
          <p className="lead text-muted-foreground">{skill.description}</p>
        )}
        {content ? (
          <Markdown>{content}</Markdown>
        ) : !skill.description ? (
          <p className="text-muted-foreground">
            No detailed content available for this skill.
          </p>
        ) : null}
      </div>
    </div>
  );
}
