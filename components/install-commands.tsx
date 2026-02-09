"use client";

import { useState } from "react";
import { Button } from "@/components/ui/cubby-ui/button";
import {
  generateInstallCommands,
  generateAllCommandsText,
  type BundleSkill,
} from "@/lib/install-commands";

interface InstallCommandsProps {
  skills: BundleSkill[];
}

export function InstallCommands({ skills }: InstallCommandsProps) {
  const commands = generateInstallCommands(skills);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopyAll() {
    const text = generateAllCommandsText(skills);
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  async function handleCopyOne(index: number, command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  if (commands.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Install commands</h3>
        <Button variant="outline" size="xs" onClick={handleCopyAll}>
          {copiedAll ? "Copied!" : "Copy all"}
        </Button>
      </div>

      <div className="space-y-3">
        {commands.map((cmd, i) => (
          <div key={cmd.source} className="group">
            <p className="text-xs text-muted-foreground mb-1">
              {cmd.source}
              <span className="ml-1">
                ({cmd.skills.length} skill{cmd.skills.length !== 1 ? "s" : ""})
              </span>
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-sm font-mono">
                {cmd.command}
              </pre>
              <Button
                variant="ghost"
                size="xs"
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopyOne(i, cmd.command)}
              >
                {copiedIndex === i ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
