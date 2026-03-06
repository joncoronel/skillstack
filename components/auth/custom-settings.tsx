"use client";

import * as React from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { revokeSession } from "@/app/(main)/settings/custom/actions";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/cubby-ui/avatar";
import { Button } from "@/components/ui/cubby-ui/button";
import { Input } from "@/components/ui/cubby-ui/input";
import { Label } from "@/components/ui/cubby-ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/cubby-ui/card";
import { Separator } from "@/components/ui/cubby-ui/separator";
import { Badge } from "@/components/ui/cubby-ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsPanels,
  TabsContent,
} from "@/components/ui/cubby-ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from "@/components/ui/cubby-ui/alert-dialog";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
        <Separator />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileTab() {
  const { isLoaded, user } = useUser();
  const [firstName, setFirstName] = React.useState(user?.firstName ?? "");
  const [lastName, setLastName] = React.useState(user?.lastName ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isLoaded || !user) return <ProfileSkeleton />;

  const initials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await user.update({ firstName, lastName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await user.setProfileImage({ file });
    } catch (err) {
      console.error("Failed to update avatar:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Manage your public profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarImage src={user.imageUrl} alt={user.fullName ?? "Avatar"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change avatar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Saved
            </span>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Security Tab
// ---------------------------------------------------------------------------

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function SecuritySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-3">
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

function SecurityTab() {
  const { isLoaded, user } = useUser();

  if (!isLoaded || !user) return <SecuritySkeleton />;

  const connectedAccounts = user.externalAccounts ?? [];

  const handleDisconnect = async (accountId: string) => {
    const account = connectedAccounts.find((a) => a.id === accountId);
    if (!account) return;
    try {
      await account.destroy();
      await user.reload();
    } catch (err) {
      console.error("Failed to disconnect account:", err);
    }
  };

  const handleConnect = async (strategy: string) => {
    try {
      const res = await user.createExternalAccount({
        strategy: strategy as Parameters<
          typeof user.createExternalAccount
        >[0]["strategy"],
        redirectUrl: "/settings/custom",
      });
      const redirectUrl =
        res?.verification?.externalVerificationRedirectURL?.href;
      if (redirectUrl) {
        globalThis.location.assign(redirectUrl);
      }
    } catch (err) {
      console.error("Failed to connect account:", err);
    }
  };

  const availableProviders = ["oauth_google", "oauth_github"];
  const connectedProviderIds = connectedAccounts.map(
    (a) => `oauth_${a.provider}`,
  );
  const unconnectedProviders = availableProviders.filter(
    (p) => !connectedProviderIds.includes(p),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>Manage your linked social accounts</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {connectedAccounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No connected accounts.
          </p>
        )}

        {connectedAccounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {capitalize(account.provider)}
              </span>
              <span className="text-xs text-muted-foreground">
                {account.emailAddress}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDisconnect(account.id)}
            >
              Disconnect
            </Button>
          </div>
        ))}

        {unconnectedProviders.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Add a connection</p>
              <div className="flex gap-2">
                {unconnectedProviders.map((strategy) => (
                  <Button
                    key={strategy}
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(strategy)}
                  >
                    Connect {capitalize(strategy.replace("oauth_", ""))}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sessions Tab
// ---------------------------------------------------------------------------

export interface BackendSession {
  id: string;
  status: string;
  lastActiveAt: number;
  createdAt: number;
  latestActivity: {
    deviceType?: string;
    browserName?: string;
    browserVersion?: string;
    ipAddress?: string;
    city?: string;
    country?: string;
    isMobile?: boolean;
  } | null;
}

function SessionsTab({
  sessionsPromise,
}: {
  sessionsPromise: Promise<BackendSession[]>;
}) {
  const initialSessions = React.use(sessionsPromise);
  const { session: currentSession } = useClerk();
  const [sessions, setSessions] = React.useState(initialSessions);

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>
          Devices where you&apos;re currently signed in
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active sessions found.
          </p>
        )}

        {sessions.map((session) => {
          const isCurrent = session.id === currentSession?.id;
          const activity = session.latestActivity;
          const deviceLabel = activity?.deviceType || "Unknown device";
          const browserLabel = activity?.browserName
            ? `${activity.browserName} ${activity.browserVersion ?? ""}`.trim()
            : null;
          const locationParts = [activity?.city, activity?.country].filter(
            Boolean,
          );
          const locationLabel =
            locationParts.length > 0 ? locationParts.join(", ") : null;

          return (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{deviceLabel}</span>
                  {isCurrent && <Badge variant="success">This device</Badge>}
                </div>
                {browserLabel && (
                  <span className="text-xs text-muted-foreground">
                    {browserLabel}
                  </span>
                )}
                {(activity?.ipAddress || locationLabel) && (
                  <span className="text-xs text-muted-foreground">
                    {[activity?.ipAddress, locationLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Last active:{" "}
                  {session.lastActiveAt
                    ? new Date(session.lastActiveAt).toLocaleString()
                    : "Unknown"}
                </span>
              </div>
              {!isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Danger Zone
// ---------------------------------------------------------------------------

function DangerZoneSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  if (!isLoaded || !user) return <DangerZoneSkeleton />;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await user.delete();
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Failed to delete account:", err);
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            Delete account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete your account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All your data, bundles, and
                settings will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                Cancel
              </AlertDialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete account"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function SessionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CustomSettingsPage({
  sessionsPromise,
}: {
  sessionsPromise: Promise<BackendSession[]>;
}) {
  return (
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
  );
}
