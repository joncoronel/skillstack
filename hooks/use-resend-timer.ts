import * as React from "react";

const DEFAULT_COOLDOWN = 30;

export function useResendTimer(cooldown = DEFAULT_COOLDOWN) {
  const [countdown, setCountdown] = React.useState(0);

  const startTimer = React.useCallback(() => {
    setCountdown(cooldown);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return interval;
  }, [cooldown]);

  const resetTimer = React.useCallback(() => setCountdown(0), []);

  return { countdown, startTimer, resetTimer };
}
