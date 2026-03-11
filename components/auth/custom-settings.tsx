"use client";

import * as React from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
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
import { Checkbox } from "@/components/ui/cubby-ui/checkbox";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { useAnimatedHeight } from "@/hooks/cubby-ui/use-animated-height";
import { cn } from "@/lib/utils";

const CROSSFADE_CLASSES = cn(
  "ease-out-cubic transition-[opacity,filter,transform,scale] duration-200",
  "motion-reduce:transition-none",
);

function Crossfade({
  active,
  children,
}: {
  active: boolean;
  children: [React.ReactNode, React.ReactNode];
}) {
  const { outerRef, innerRef } = useAnimatedHeight();
  const [first, second] = children;

  return (
    <div
      ref={outerRef}
      className="transition-[height] duration-270 ease-[cubic-bezier(0.25,1,0.5,1)]"
    >
      <div ref={innerRef} className="grid">
        <div
          className={cn(
            "[grid-area:1/1]",
            CROSSFADE_CLASSES,
            active
              ? "contain-[size] pointer-events-none scale-97 opacity-0 blur-sm"
              : "scale-100 opacity-100",
          )}
          aria-hidden={active}
        >
          {first}
        </div>

        <div
          className={cn(
            "[grid-area:1/1]",
            CROSSFADE_CLASSES,
            active
              ? "scale-100 opacity-100"
              : "contain-[size] pointer-events-none scale-97 opacity-0 blur-sm",
          )}
          aria-hidden={!active}
        >
          {second}
        </div>
      </div>
    </div>
  );
}

function getClerkErrorMessage(err: unknown, fallback: string): string {
  if (isClerkAPIResponseError(err)) {
    return err.errors[0]?.longMessage ?? fallback;
  }
  return fallback;
}

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
  const [editing, setEditing] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isLoaded || !user) return <ProfileSkeleton />;

  const initials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const startEditing = () => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await user.update({ firstName, lastName });
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await user.setProfileImage({ file });
    } catch (err) {
      console.error("Failed to update avatar:", err);
    }
  };

  const handleAvatarRemove = async () => {
    try {
      await user.setProfileImage({ file: null });
    } catch (err) {
      console.error("Failed to remove avatar:", err);
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
        <Crossfade active={editing}>
          {/* Read-only summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                <AvatarImage
                  src={user.imageUrl}
                  alt={user.fullName ?? "Avatar"}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user.fullName || "No name set"}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={startEditing}>
              Update profile
            </Button>
          </div>

          {/* Edit form */}
          <Card className="bg-background" variant="inset">
            <CardHeader>
              <CardTitle>Update profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarImage
                    src={user.imageUrl}
                    alt={user.fullName ?? "Avatar"}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={handleAvatarRemove}
                    >
                      Remove
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Recommended size 1:1, up to 10MB.
                  </span>
                </div>
              </div>

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
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Crossfade>

        <Separator />

        <EmailSection />
      </CardContent>
    </Card>
  );
}

function EmailSection() {
  const { user } = useUser();
  const [adding, setAdding] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [emailObj, setEmailObj] =
    React.useState<
      NonNullable<ReturnType<typeof useUser>["user"]>["emailAddresses"][number]
    >();
  const [error, setError] = React.useState("");

  if (!user) return null;

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await user.createEmailAddress({ email: newEmail });
      await user.reload();
      const emailAddress = user.emailAddresses.find((a) => a.id === res.id);
      setEmailObj(emailAddress);
      await emailAddress?.prepareVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err) {
      setError(getClerkErrorMessage(err, "Failed to add email"));
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await emailObj?.attemptVerification({ code });
      if (result?.verification.status === "verified") {
        await user.reload();
        setAdding(false);
        setVerifying(false);
        setNewEmail("");
        setCode("");
        setEmailObj(undefined);
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, "Invalid code"));
    }
  };

  const handleRemoveEmail = async (emailId: string) => {
    const email = user.emailAddresses.find((e) => e.id === emailId);
    if (!email) return;
    try {
      await email.destroy();
      await user.reload();
    } catch (err) {
      console.error("Failed to remove email:", err);
    }
  };

  const handleSetPrimary = async (emailId: string) => {
    try {
      await user.update({ primaryEmailAddressId: emailId });
      await user.reload();
    } catch (err) {
      console.error("Failed to set primary email:", err);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>Email addresses</Label>
      {user.emailAddresses.map((email) => (
        <div
          key={email.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{email.emailAddress}</span>
            {email.id === user.primaryEmailAddressId && (
              <Badge variant="secondary">Primary</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {email.id !== user.primaryEmailAddressId && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetPrimary(email.id)}
                >
                  Set primary
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEmail(email.id)}
                >
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
      ))}

      <Crossfade active={adding}>
        {/* Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setAdding(true)}
        >
          + Add email address
        </Button>

        {/* Add / Verify forms */}
        <Card className="bg-background" variant="inset">
          <CardHeader>
            <CardTitle>Add email address</CardTitle>
            <CardDescription>
              {verifying
                ? `Enter the code sent to ${newEmail}`
                : "You\u2019ll need to verify this email address before it can be added to your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!verifying ? (
              <form onSubmit={handleAddEmail} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="addEmail">Email address</Label>
                  <Input
                    id="addEmail"
                    type="email"
                    placeholder="Enter your email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            ) : (
              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="verifyCode">Verification code</Label>
                  <Input
                    id="verifyCode"
                    type="text"
                    placeholder="Enter code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVerifying(false);
                  setAdding(false);
                  setNewEmail("");
                  setCode("");
                  setError("");
                  setEmailObj(undefined);
                }}
              >
                Cancel
              </Button>
              {!verifying ? (
                <Button size="sm" onClick={handleAddEmail}>
                  Add
                </Button>
              ) : (
                <Button size="sm" onClick={handleVerify}>
                  Verify
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Crossfade>
    </div>
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

function SecurityTab() {
  const { isLoaded, user } = useUser();

  if (!isLoaded || !user) return <SecuritySkeleton />;

  const hasPassword = user.passwordEnabled;
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
    <div className="flex flex-col gap-6">
      <PasswordSection hasPassword={hasPassword} />

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
    </div>
  );
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const { user } = useUser();
  const [editing, setEditing] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [signOutOthers, setSignOutOthers] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  if (!user) return null;

  const resetForm = () => {
    setEditing(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSignOutOthers(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await user.updatePassword({
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
        signOutOfOtherSessions: signOutOthers,
      });
      setSuccess(true);
      resetForm();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getClerkErrorMessage(err, "Failed to update password"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          {hasPassword
            ? "Change your account password"
            : "Set a password for email-based sign in"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Crossfade active={editing}>
          {/* Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              {hasPassword ? "Change password" : "Set password"}
            </Button>
            {success && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                Password updated
              </span>
            )}
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 max-w-sm"
          >
            {hasPassword && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <label className="flex items-start gap-3">
              <Checkbox
                checked={signOutOthers}
                onCheckedChange={(checked) =>
                  setSignOutOthers(checked === true)
                }
                className="mt-0.5"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Sign out of all other devices
                </span>
                <span className="text-xs text-muted-foreground">
                  It is recommended to sign out of all other devices which may
                  have used your old password.
                </span>
              </div>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Crossfade>
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
