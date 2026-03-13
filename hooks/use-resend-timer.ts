import * as React from "react";

const DEFAULT_COOLDOWN = 30;

export function useResendTimer(cooldown = DEFAULT_COOLDOWN) {
  const [countdown, setCountdown] = React.useState(0);
  const intervalRef = React.useRef<ReturnType<typeof setInterval>>(undefined);

  const clearExistingInterval = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const startTimer = React.useCallback(() => {
    clearExistingInterval();
    setCountdown(cooldown);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldown, clearExistingInterval]);

  const resetTimer = React.useCallback(() => {
    clearExistingInterval();
    setCountdown(0);
  }, [clearExistingInterval]);

  React.useEffect(() => clearExistingInterval, [clearExistingInterval]);

  return { countdown, startTimer, resetTimer };
}
