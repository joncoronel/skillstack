"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SkillCard } from "@/components/skill-card";
import { SkillDetailSheet } from "@/components/skill-detail-sheet";
import { InstallCommands } from "@/components/install-commands";
import { Button } from "@/components/ui/cubby-ui/button";
import { Switch } from "@/components/ui/cubby-ui/switch";
import { Input } from "@/components/ui/cubby-ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/cubby-ui/dialog";
import { CopyButton } from "@/components/ui/cubby-ui/copy-button/copy-button";

interface BundleViewProps {
  preloadedBundle: Preloaded<typeof api.bundles.getBySlug>;
}

interface SkillInfo {
  source: string;
  skillId: string;
  name: string;
  description?: string;
  installs: number;
  technologies: string[];
  updatedSinceAdded?: boolean;
}

export function BundleView({ preloadedBundle }: BundleViewProps) {
  const bundle = usePreloadedQuery(preloadedBundle);
  const [activeSkill, setActiveSkill] = useState<SkillInfo | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const updateVisibility = useMutation(api.bundles.updateBundleVisibility);
  const generateShare = useMutation(api.bundles.generateShareToken);
  const revokeShare = useMutation(api.bundles.revokeShareToken);

  if (bundle === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24 text-center">
        <h1 className="text-2xl font-bold">Bundle not found</h1>
        <p className="mt-2 text-muted-foreground">
          This bundle may have been deleted or the link is incorrect.
        </p>
        <Button
          variant="primary"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Back to home
        </Button>
      </div>
    );
  }

  const updatedCount = bundle.skills.filter((s) => s.updatedSinceAdded).length;

  return (
    <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{bundle.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          by {bundle.creatorName} &middot; {bundle.skills.length} skill
          {bundle.skills.length !== 1 ? "s" : ""}
        </p>

        {bundle.isOwner && (
          <div className="mt-4 flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRenameDialogOpen(true)}
              >
                Rename
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  id="bundle-visibility"
                  checked={bundle.isPublic}
                  onCheckedChange={(checked) =>
                    updateVisibility({
                      bundleId: bundle._id,
                      isPublic: checked,
                    })
                  }
                />
                <label
                  htmlFor="bundle-visibility"
                  className="text-sm text-muted-foreground"
                >
                  {bundle.isPublic ? "Public" : "Private"}
                </label>
              </div>
            </div>

            {!bundle.isPublic && (
              <div className="flex items-center gap-2">
                {bundle.shareToken ? (
                  <>
                    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-md border bg-muted/50 px-2.5 py-1.5">
                      <span className="truncate text-xs text-muted-foreground">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/stack/${bundle.slug}?share=${bundle.shareToken}`
                          : `/stack/${bundle.slug}?share=${bundle.shareToken}`}
                      </span>
                      <CopyButton
                        content={
                          typeof window !== "undefined"
                            ? `${window.location.origin}/stack/${bundle.slug}?share=${bundle.shareToken}`
                            : `/stack/${bundle.slug}?share=${bundle.shareToken}`
                        }
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        revokeShare({ bundleId: bundle._id })
                      }
                    >
                      Revoke
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      generateShare({ bundleId: bundle._id })
                    }
                  >
                    Create share link
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {updatedCount > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300">
          {updatedCount} skill{updatedCount !== 1 ? "s have" : " has"} been
          updated since you saved this bundle. Re-run the install commands to
          get the latest versions.
        </div>
      )}

      <section className="mb-10">
        <InstallCommands skills={bundle.skills} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Skills in this bundle
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundle.skills.map((skill) => (
            <SkillCard
              key={`${skill.source}/${skill.skillId}`}
              name={skill.name}
              source={skill.source}
              skillId={skill.skillId}
              description={skill.description}
              installs={skill.installs}
              technologies={skill.technologies}
              updatedSinceAdded={skill.updatedSinceAdded}
              onViewDetail={() => setActiveSkill(skill)}
            />
          ))}
        </div>
      </section>

      <SkillDetailSheet
        open={activeSkill !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSkill(null);
        }}
        skill={activeSkill}
      />

      {bundle.isOwner && (
        <RenameBundleDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          bundleId={bundle._id}
          currentName={bundle.name}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Rename dialog
// ---------------------------------------------------------------------------

interface RenameBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleId: Id<"bundles">;
  currentName: string;
}

function RenameBundleDialog({
  open,
  onOpenChange,
  bundleId,
  currentName,
}: RenameBundleDialogProps) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const updateName = useMutation(api.bundles.updateBundleName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await updateName({ bundleId, name: trimmed });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename bundle</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div>
            <label
              htmlFor="rename-bundle-name"
              className="text-sm font-medium mb-1.5 block"
            >
              Bundle name
            </label>
            <Input
              id="rename-bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            loading={saving}
          >
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
