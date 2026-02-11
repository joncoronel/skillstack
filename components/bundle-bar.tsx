"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/cubby-ui/button";
import { Sheet, SheetContent } from "@/components/ui/cubby-ui/sheet";
import { useBundleSelection } from "@/lib/bundle-selection-context";
import { generateAllCommandsText } from "@/lib/install-commands";
import { SaveBundleDialog } from "@/components/save-bundle-dialog";

export function BundleBar() {
  const selection = useBundleSelection();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!selection) return null;
  const { selectedSkills, clearAll, count } = selection;

  async function handleCopy() {
    const text = generateAllCommandsText(selectedSkills);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    setDialogOpen(true);
  }

  return (
    <>
      <Sheet open={count > 0} modal={false}>
        <SheetContent
          side="bottom"
          variant="floating"
          showBackdrop={false}
          showCloseButton={false}
          className="max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:ring-0 max-sm:shadow-none max-sm:border-t max-sm:data-starting-style:translate-y-full max-sm:data-ending-style:translate-y-full sm:inset-x-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto sm:max-w-none"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 px-4 py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium whitespace-nowrap">
                {count} skill{count !== 1 ? "s" : ""} selected
              </span>
              <Button variant="ghost" size="xs" onClick={clearAll}>
                Clear
              </Button>
            </div>

            <div className="hidden sm:block h-4 w-px bg-border" />

            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy install"}
              </Button>

              {count >= 2 && count <= 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = selectedSkills
                      .map((s) => `${s.source}:${s.skillId}`)
                      .join(",");
                    router.push(
                      `/compare?skills=${encodeURIComponent(params)}`,
                    );
                  }}
                >
                  Compare
                </Button>
              )}

              <Button variant="primary" size="sm" onClick={handleSave}>
                {isSignedIn ? "Save bundle" : "Sign in to save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SaveBundleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
