"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, SecurityLockIcon } from "@hugeicons/core-free-icons";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsPanels,
  TabsContent,
} from "@/components/ui/cubby-ui/tabs";
import { ReverificationProvider } from "./reverification-provider";
import { ProfileTab } from "./profile-tab";
import { SecurityTab, type BackendSession } from "./security-tab";

export type { BackendSession };

export function CustomSettingsPage({
  sessionsPromise,
}: {
  sessionsPromise: Promise<BackendSession[]>;
}) {
  return (
    <ReverificationProvider>
      <Tabs defaultValue="profile" className="gap-8">
        <TabsList variant="underline">
          <TabsTrigger value="profile">
            <HugeiconsIcon icon={UserIcon} data-icon="inline-start" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <HugeiconsIcon icon={SecurityLockIcon} data-icon="inline-start" />
            Security
          </TabsTrigger>
        </TabsList>
        <TabsPanels>
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="security">
            <SecurityTab sessionsPromise={sessionsPromise} />
          </TabsContent>
        </TabsPanels>
      </Tabs>
    </ReverificationProvider>
  );
}
