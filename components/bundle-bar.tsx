"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/cubby-ui/button";
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
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-40 sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
          >
            <div className="flex items-center gap-3 border-t sm:border sm:rounded-2xl bg-card px-4 py-3 shadow-lg sm:shadow-xl">
              <span className="text-sm font-medium whitespace-nowrap">
                {count} skill{count !== 1 ? "s" : ""} selected
              </span>

              <Button variant="ghost" size="xs" onClick={clearAll}>
                Clear
              </Button>

              <div className="h-4 w-px bg-border" />

              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy install"}
              </Button>

              <Button variant="primary" size="sm" onClick={handleSave}>
                {isSignedIn ? "Save bundle" : "Sign in to save"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SaveBundleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
