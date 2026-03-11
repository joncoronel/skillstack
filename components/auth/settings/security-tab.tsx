"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/cubby-ui/card";
import { PasswordSection } from "./password-section";
import { SessionsTab, SessionsSkeleton, type BackendSession } from "./sessions-tab";
import { DangerZone } from "./danger-zone";

export type { BackendSession };

function SecuritySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SecurityTab({
  sessionsPromise,
}: {
  sessionsPromise: Promise<BackendSession[]>;
}) {
  const { isLoaded, user } = useUser();

  if (!isLoaded || !user) return <SecuritySkeleton />;

  const hasPassword = user.passwordEnabled;

  return (
    <div className="flex flex-col gap-6">
      <PasswordSection hasPassword={hasPassword} />

      <React.Suspense fallback={<SessionsSkeleton />}>
        <SessionsTab sessionsPromise={sessionsPromise} />
      </React.Suspense>

      <DangerZone />
    </div>
  );
}
