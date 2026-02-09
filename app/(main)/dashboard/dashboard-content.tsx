"use client";

import { useState } from "react";
import Link from "next/link";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BundleCard } from "@/components/bundle-card";
import { Button } from "@/components/ui/cubby-ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/cubby-ui/alert-dialog";

interface DashboardContentProps {
  preloadedBundles: Preloaded<typeof api.bundles.listByUser>;
}

export function DashboardContent({ preloadedBundles }: DashboardContentProps) {
  const bundles = usePreloadedQuery(preloadedBundles);
  const deleteBundle = useMutation(api.bundles.deleteBundle);
  const [deletingId, setDeletingId] = useState<Id<"bundles"> | null>(null);

  async function handleDelete() {
    if (!deletingId) return;
    await deleteBundle({ bundleId: deletingId });
    setDeletingId(null);
  }

  if (bundles.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold">No bundles yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select some skills and save your first bundle.
        </p>
        <Button
          variant="primary"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Create your first bundle
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => (
          <BundleCard
            key={bundle._id}
            name={bundle.name}
            slug={bundle.slug}
            skillCount={bundle.skills.length}
            createdAt={bundle.createdAt}
            creatorName="You"
            technologies={[]}
            isPublic={bundle.isPublic}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  nativeButton={false}
                  render={<Link href={`/stack/${bundle.slug}`} />}
                >
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setDeletingId(bundle._id)}
                >
                  Delete
                </Button>
              </div>
            }
          />
        ))}
      </div>

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bundle</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bundle and its shareable link.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>
              <Button variant="outline">Cancel</Button>
            </AlertDialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
