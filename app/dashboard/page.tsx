"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppHeader } from "@/components/app-header";
import { BundleCard } from "@/components/bundle-card";
import { Button } from "@/components/ui/cubby-ui/button";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/cubby-ui/alert-dialog";
import { TECHNOLOGIES } from "@/lib/technologies";

const techMap = new Map(TECHNOLOGIES.map((t) => [t.id, t.name]));

export default function DashboardPage() {
  const bundles = useQuery(api.bundles.listByUser);
  const deleteBundle = useMutation(api.bundles.deleteBundle);
  const [deletingId, setDeletingId] = useState<Id<"bundles"> | null>(null);

  async function handleDelete() {
    if (!deletingId) return;
    await deleteBundle({ bundleId: deletingId });
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 pt-12 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your bundles</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your saved skill bundles.
          </p>
        </div>

        {bundles === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : bundles.length === 0 ? (
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
        ) : (
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
        )}
      </main>

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
    </div>
  );
}
