"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/cubby-ui/input";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { FlashIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/cubby-ui/button";
import { Badge } from "@/components/ui/cubby-ui/badge";

interface RepoUrlInputProps {
  onTechnologiesDetected: (technologies: string[]) => void;
  canAutoDetect?: boolean;
}

export function RepoUrlInput({ onTechnologiesDetected, canAutoDetect = true }: RepoUrlInputProps) {
  const detectTechnologies = useAction(api.github.detectTechnologies);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDetect() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const result = await detectTechnologies({ repoUrl: trimmed });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.technologies.length === 0) {
        setError("No matching technologies found in this repository");
        return;
      }

      onTechnologiesDetected(result.technologies);
      setUrl("");
    } catch {
      setError("Failed to fetch repository. Please check the URL.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleDetect();
          }}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={handleDetect}
          disabled={!url.trim() || loading || !canAutoDetect}
          loading={loading}
          leftSection={<HugeiconsIcon icon={FlashIcon} strokeWidth={2} className="size-3.5" />}
          rightSection={!canAutoDetect ? <Badge variant="outline" className="text-[10px]">Pro</Badge> : undefined}
        >
          Detect
        </Button>
      </div>
      {!canAutoDetect && (
        <p className="text-xs text-muted-foreground">
          <Link href="/pricing" className="underline hover:text-foreground">Upgrade to Pro</Link>{" "}
          to auto-detect your stack from a GitHub repo.
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
