"use client";

import * as React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsPanels,
  TabsContent,
} from "@/components/ui/cubby-ui/tabs";
import { ReverificationProvider } from "./reverification-provider";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";
import { SessionsTab, SessionsSkeleton, type BackendSession } from "./sessions-tab";
import { DangerZone } from "./danger-zone";

export type { BackendSession };

export function CustomSettingsPage({
  sessionsPromise,
}: {
  sessionsPromise: Promise<BackendSession[]>;
}) {
  return (
    <ReverificationProvider>
      <div className="flex flex-col gap-8">
        <Tabs defaultValue="profile">
          <TabsList variant="underline">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsPanels>
            <TabsContent value="profile">
              <ProfileTab />
            </TabsContent>
            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="sessions">
              <React.Suspense fallback={<SessionsSkeleton />}>
                <SessionsTab sessionsPromise={sessionsPromise} />
              </React.Suspense>
            </TabsContent>
          </TabsPanels>
        </Tabs>

        <DangerZone />
      </div>
    </ReverificationProvider>
  );
}
