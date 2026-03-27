"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/cubby-ui/card";
import { Button } from "@/components/ui/cubby-ui/button";
import { Badge } from "@/components/ui/cubby-ui/badge";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { cn, formatInstalls, timeAgo } from "@/lib/utils";
import { toast } from "@/components/ui/cubby-ui/toast/toast";

type ErrorFilter =
  | "contentFetchError"
  | "pendingContentFetch"
  | "pendingDiscovery"
  | "noUrl"
  | "delisted";

const FILTER_LABELS: Record<ErrorFilter, string> = {
  contentFetchError: "Content Errors",
  pendingContentFetch: "Pending Fetch",
  pendingDiscovery: "Pending Discovery",
  noUrl: "No URL",
  delisted: "Delisted",
};

export function DevDashboardContent() {
  const admin = useQuery(api.devStats.isAdmin, {});
  const syncStats = useQuery(api.devStats.getSyncStats, admin ? {} : "skip");

  const [activeFilter, setActiveFilter] =
    useState<ErrorFilter>("contentFetchError");

  if (admin === false) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        You don&apos;t have access to this page.
      </p>
    );
  }

  const stats = {
    totalSkills: syncStats?.totalSkills ?? 0,
    contentFetchErrors: syncStats?.contentFetchErrors ?? 0,
    pendingContentFetch: syncStats?.pendingContentFetch ?? 0,
    pendingDiscovery: syncStats?.pendingDiscovery ?? 0,
    noSkillMdUrl: syncStats?.noSkillMdUrl ?? 0,
    delisted: syncStats?.delisted ?? 0,
  };

  const loading = syncStats === undefined;

  return (
    <div className="space-y-8">
      <StatsCards stats={stats} loading={loading} />
      <ErrorSkillsList
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        stats={stats}
      />
      <AdminActions />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatsCards({
  stats,
  loading,
}: {
  stats: {
    totalSkills: number;
    contentFetchErrors: number;
    pendingContentFetch: number;
    pendingDiscovery: number;
    noSkillMdUrl: number;
    delisted: number;
  };
  loading?: boolean;
}) {
  const cards = [
    { label: "Total Skills", value: stats.totalSkills, warn: false },
    {
      label: "Content Errors",
      value: stats.contentFetchErrors,
      warn: stats.contentFetchErrors > 0,
    },
    {
      label: "Pending Fetch",
      value: stats.pendingContentFetch,
      warn: stats.pendingContentFetch > 50,
    },
    {
      label: "Pending Discovery",
      value: stats.pendingDiscovery,
      warn: stats.pendingDiscovery > 50,
    },
    {
      label: "No URL",
      value: stats.noSkillMdUrl,
      warn: false,
    },
    {
      label: "Delisted",
      value: stats.delisted,
      warn: false,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {loading ? "..." : card.value.toLocaleString()}
              {card.warn && (
                <Badge variant="warning" className="ml-2 text-xs align-middle">
                  !
                </Badge>
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error Skills List
// ---------------------------------------------------------------------------

function ErrorSkillsList({
  activeFilter,
  onFilterChange,
  stats,
}: {
  activeFilter: ErrorFilter;
  onFilterChange: (filter: ErrorFilter) => void;
  stats: {
    contentFetchErrors: number;
    pendingContentFetch: number;
    pendingDiscovery: number;
    noSkillMdUrl: number;
    delisted: number;
  };
}) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const result = useQuery(api.devStats.listSkillsWithErrors, {
    filter: activeFilter,
    cursor,
  });

  const retryFetch = useAction(api.devStats.callRetryContentFetch);
  const retryDiscovery = useAction(api.devStats.callRetryDiscovery);
  const retryBatch = useAction(api.devStats.callRetryBatch);
  const [batchLoading, setBatchLoading] = useState(false);

  const filterCounts: Record<ErrorFilter, number> = {
    contentFetchError: stats.contentFetchErrors,
    pendingContentFetch: stats.pendingContentFetch,
    pendingDiscovery: stats.pendingDiscovery,
    noUrl: stats.noSkillMdUrl,
    delisted: stats.delisted,
  };

  const handleRetryFetch = async (skillId: Id<"skills">) => {
    try {
      await retryFetch({ skillId });
      toast.info({ title: "Skill queued for content re-fetch" });
    } catch {
      toast.error({ title: "Failed to queue retry" });
    }
  };

  const handleRetryDiscovery = async (skillId: Id<"skills">) => {
    try {
      await retryDiscovery({ skillId });
      toast.info({ title: "Skill queued for URL re-discovery" });
    } catch {
      toast.error({ title: "Failed to queue re-discovery" });
    }
  };

  const handleRetryBatch = async () => {
    if (activeFilter !== "contentFetchError" && activeFilter !== "noUrl")
      return;
    setBatchLoading(true);
    try {
      const result = await retryBatch({ filter: activeFilter });
      toast.info({ title: `Queued ${result.count} skills for retry` });
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as ErrorFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                onFilterChange(filter);
                setCursor(undefined);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {FILTER_LABELS[filter]}
              <span className="ml-1.5 opacity-70">
                {filterCounts[filter].toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        {/* Batch action */}
        {(activeFilter === "contentFetchError" || activeFilter === "noUrl") && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryBatch}
              disabled={batchLoading}
            >
              {batchLoading
                ? "Retrying..."
                : `Retry All ${FILTER_LABELS[activeFilter]}`}
            </Button>
          </div>
        )}

        {/* Skills list */}
        {result === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : result.skills.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No skills in this category.
          </p>
        ) : (
          <>
            <div className="divide-y divide-border rounded-lg border">
              {result.skills.map((skill) => (
                <SkillRow
                  key={skill._id}
                  skill={skill}
                  filter={activeFilter}
                  onRetryFetch={handleRetryFetch}
                  onRetryDiscovery={handleRetryDiscovery}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center gap-2">
              {cursor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCursor(undefined)}
                >
                  First page
                </Button>
              )}
              {!result.isDone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCursor(result.nextCursor)}
                >
                  Next page
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {result.skills.length} shown
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SkillRow({
  skill,
  filter,
  onRetryFetch,
  onRetryDiscovery,
}: {
  skill: {
    _id: Id<"skills">;
    source: string;
    skillId: string;
    name: string;
    installs: number;
    hasContentFetchError?: boolean;
    skillMdUrl?: string;
    needsDiscovery?: boolean;
    needsContentFetch?: boolean;
    contentFetchedAt?: number;
    isDelisted?: boolean;
  };
  filter: ErrorFilter;
  onRetryFetch: (id: Id<"skills">) => void;
  onRetryDiscovery: (id: Id<"skills">) => void;
}) {
  const probeUrl = useAction(api.devStats.probeSkillUrl);
  const [probeResult, setProbeResult] = useState<{
    status: number;
    ok: boolean;
    error?: string;
  } | null>(null);
  const [probing, setProbing] = useState(false);

  const hasUrl = skill.skillMdUrl && skill.skillMdUrl !== "";
  const repoUrl = `https://github.com/${skill.source}`;
  const skillMdLink = hasUrl ? skill.skillMdUrl! : null;

  const handleProbe = async () => {
    if (!skillMdLink) return;
    setProbing(true);
    try {
      const result = await probeUrl({ url: skillMdLink });
      setProbeResult(result);
    } catch {
      setProbeResult({ status: 0, ok: false, error: "probe failed" });
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{skill.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatInstalls(skill.installs)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate underline decoration-muted-foreground/40 hover:decoration-muted-foreground"
          >
            {skill.source}/{skill.skillId}
          </a>
          {skillMdLink && (
            <a
              href={skillMdLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 underline decoration-muted-foreground/40 hover:decoration-muted-foreground"
            >
              SKILL.md
            </a>
          )}
          {skill.contentFetchedAt && (
            <span className="shrink-0">
              fetched {timeAgo(skill.contentFetchedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex shrink-0 items-center gap-1.5">
        {skill.hasContentFetchError && <Badge variant="warning">error</Badge>}
        {skill.isDelisted && <Badge variant="secondary">delisted</Badge>}
        {skill.skillMdUrl === "" && <Badge variant="outline">no url</Badge>}
        {probeResult && (
          <Badge variant={probeResult.ok ? "info" : "warning"}>
            {probeResult.status || "err"}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {skillMdLink && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleProbe}
            disabled={probing}
          >
            {probing ? "..." : "Test"}
          </Button>
        )}
        {(filter === "contentFetchError" || filter === "pendingContentFetch") &&
          hasUrl && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => onRetryFetch(skill._id)}
            >
              Retry Fetch
            </Button>
          )}
        {(filter === "contentFetchError" || filter === "noUrl") && !hasUrl && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => onRetryDiscovery(skill._id)}
          >
            Re-discover
          </Button>
        )}
        {filter === "contentFetchError" && hasUrl && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onRetryDiscovery(skill._id)}
          >
            Re-discover
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Actions
// ---------------------------------------------------------------------------

function AdminActions() {
  const triggerSync = useAction(api.devStats.triggerSync);
  const triggerBackfill = useAction(api.devStats.triggerBackfill);
  const triggerRecalculate = useAction(api.devStats.triggerRecalculateStats);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (label: string, fn: () => Promise<unknown>) => {
    setLoading(label);
    try {
      await fn();
      toast.info({ title: `${label} scheduled` });
    } catch (e) {
      toast.error({ title: `Failed to schedule ${label}` });
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const actions = [
    {
      label: "Run Sync",
      description:
        "Trigger the full skill sync pipeline (fetch API, upsert, discover, content fetch).",
      fn: () => triggerSync({}),
    },
    {
      label: "Backfill Summaries",
      description:
        "Re-populate all skillSummary denormalized fields from the skills table.",
      fn: () => triggerBackfill({ type: "summaries" as const }),
    },
    {
      label: "Backfill Sync Flags",
      description:
        "Set missing needsDiscovery/needsContentFetch/syncHash on skill rows.",
      fn: () => triggerBackfill({ type: "syncFlags" as const }),
    },
    {
      label: "Refresh Stats",
      description:
        "Recalculate dashboard stat counts by scanning all summaries.",
      fn: () => triggerRecalculate({}),
    },
    {
      label: "Re-tag All Skills",
      description:
        "Re-run technology tagging on all skills using the latest keyword rules.",
      fn: () => triggerBackfill({ type: "retag" as const }),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <div
              key={action.label}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={loading !== null}
                onClick={() => handleAction(action.label, action.fn)}
              >
                {loading === action.label ? "..." : "Run"}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Actions run in the background. Check Convex logs for progress.
        </p>
      </CardContent>
    </Card>
  );
}
