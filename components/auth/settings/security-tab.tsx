"use client";

import * as React from "react";
import { useUser, useReverification } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { Button } from "@/components/ui/cubby-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/cubby-ui/card";
import { Separator } from "@/components/ui/cubby-ui/separator";
import { Skeleton } from "@/components/ui/cubby-ui/skeleton";
import { useReverificationFlow } from "./reverification-provider";
import { PasswordSection } from "./password-section";

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

export function SecurityTab() {
  const { isLoaded, user } = useUser();
  const onNeedsReverification = useReverificationFlow();

  const connectAccount = useReverification(
    (strategy: string) =>
      user?.createExternalAccount({
        strategy: strategy as Parameters<
          typeof user.createExternalAccount
        >[0]["strategy"],
        redirectUrl: "/settings/custom",
      }),
    { onNeedsReverification },
  );

  const disconnectAccount = useReverification(
    (accountId: string) => {
      const account = user?.externalAccounts?.find((a) => a.id === accountId);
      return account?.destroy();
    },
    { onNeedsReverification },
  );

  if (!isLoaded || !user) return <SecuritySkeleton />;

  const hasPassword = user.passwordEnabled;
  const connectedAccounts = user.externalAccounts ?? [];

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnectAccount(accountId);
      await user.reload();
    } catch (err) {
      if (isReverificationCancelledError(err)) return;
      console.error("Failed to disconnect account:", err);
    }
  };

  const handleConnect = async (strategy: string) => {
    try {
      const res = await connectAccount(strategy);
      const redirectUrl =
        res?.verification?.externalVerificationRedirectURL?.href;
      if (redirectUrl) {
        globalThis.location.assign(redirectUrl);
      }
    } catch (err) {
      if (isReverificationCancelledError(err)) return;
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
