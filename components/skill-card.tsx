"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/cubby-ui/card";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { TECHNOLOGIES } from "@/lib/technologies";

interface SkillCardProps {
  name: string;
  source: string;
  skillId: string;
  description?: string;
  installs: number;
  technologies: string[];
}

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function SkillCard({
  name,
  source,
  description,
  installs,
  technologies,
}: SkillCardProps) {
  const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-1">
        <CardTitle className="text-sm leading-snug">{name}</CardTitle>
        <CardAction>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatInstalls(installs)} installs
          </span>
        </CardAction>
        <CardDescription className="text-xs line-clamp-2">
          {description ?? source}
        </CardDescription>
      </CardHeader>
      {technologies.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {technologies.slice(0, 4).map((techId) => (
              <Badge
                key={techId}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5"
              >
                {techMap.get(techId) ?? techId}
              </Badge>
            ))}
            {technologies.length > 4 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0.5"
              >
                +{technologies.length - 4}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
