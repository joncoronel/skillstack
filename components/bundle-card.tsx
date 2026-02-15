import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/cubby-ui/card";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { TECHNOLOGIES } from "@/lib/technologies";
import { timeAgo } from "@/lib/utils";

interface BundleCardProps {
  name: string;
  urlId: string;
  skillCount: number;
  createdAt: number;
  creatorName: string;
  creatorImage?: string;
  technologies: string[];
  isPublic?: boolean;
  actions?: React.ReactNode;
}

const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

export function BundleCard({
  name,
  urlId,
  skillCount,
  createdAt,
  creatorName,
  technologies,
  isPublic = true,
  actions,
}: BundleCardProps) {
  const content = (
    <Card className="gap-3 py-4 transition-colors hover:bg-muted/50">
      <CardHeader className="gap-1">
        <CardTitle className="text-sm leading-snug">{name}</CardTitle>
        <CardAction>
          <div className="flex items-center gap-1.5">
            {!isPublic && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                Private
              </Badge>
            )}
            <span className="text-xs tabular-nums text-muted-foreground">
              {skillCount} skill{skillCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardAction>
        <CardDescription className="text-xs">
          by {creatorName} &middot; {timeAgo(createdAt)}
        </CardDescription>
      </CardHeader>
      {technologies.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {technologies.slice(0, 5).map((techId) => (
              <Badge
                key={techId}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5"
              >
                {techMap.get(techId) ?? techId}
              </Badge>
            ))}
            {technologies.length > 5 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                +{technologies.length - 5}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
      {actions && <CardFooter>{actions}</CardFooter>}
    </Card>
  );

  if (actions) {
    return content;
  }

  return <Link href={`/stack/${urlId}`}>{content}</Link>;
}
