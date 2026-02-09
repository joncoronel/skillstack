"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/cubby-ui/dialog";
import { Input } from "@/components/ui/cubby-ui/input";
import { Button } from "@/components/ui/cubby-ui/button";
import { useBundleSelection } from "@/lib/bundle-selection-context";

interface SaveBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveBundleDialog({ open, onOpenChange }: SaveBundleDialogProps) {
  const selection = useBundleSelection();
  const createBundle = useMutation(api.bundles.createBundle);
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!selection) return null;
  const { selectedSkills, clearAll, count } = selection;

  async function handleSave() {
    if (!name.trim() || count === 0) return;

    setSaving(true);
    try {
      const result = await createBundle({
        name: name.trim(),
        skills: selectedSkills.map(({ source, skillId }) => ({
          source,
          skillId,
        })),
        isPublic: true,
      });

      clearAll();
      setName("");
      onOpenChange(false);
      router.push(`/stack/${result.slug}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save bundle</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="bundle-name"
                className="text-sm font-medium mb-1.5 block"
              >
                Bundle name
              </label>
              <Input
                id="bundle-name"
                placeholder="My React stack"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {count} skill{count !== 1 ? "s" : ""} will be saved. Anyone with
              the link can view your bundle.
            </p>
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
            Save bundle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
