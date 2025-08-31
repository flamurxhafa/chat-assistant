"use client";

import { errorHandlingFetcher, RedirectError } from "@/lib/fetcher";
import useSWR from "swr";
import { Modal } from "../Modal";
import { useCallback, useEffect, useState, useRef } from "react";
import { getSecondsUntilExpiration } from "@/lib/time";
import { User } from "@/lib/types";
import { refreshToken } from "./refreshUtils";
import { NEXT_PUBLIC_CUSTOM_REFRESH_URL } from "@/lib/constants";
import { logout } from "@/lib/user";
import { usePathname, useRouter } from "next/navigation";

export const HealthCheckBanner = () => {
  const router = useRouter();
  const { error } = useSWR("/api/health", errorHandlingFetcher);
  const [expired, setExpired] = useState(false);
  const [showLoggedOutModal, setShowLoggedOutModal] = useState(false);
  const pathname = usePathname();
  const expirationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Reduce revalidation frequency with dedicated SWR config
  const {
    data: user,
    mutate: mutateUser,
    error: userError,
  } = useSWR<User>("/api/me", errorHandlingFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000, // 30 seconds
  });

  // Handle 403 errors from the /api/me endpoint
  useEffect(() => {
    if (userError && userError.status === 403) {
      logout().then(() => {
        if (!pathname?.includes("/auth")) {
          setShowLoggedOutModal(true);
        }
      });
    }
  }, [userError, pathname]);

  // 🚨 Auto-redirect when logged out
  useEffect(() => {
    if (showLoggedOutModal) {
      // Choose one:
      router.push("/auth/login");       // SPA-style
      // window.location.href = "/auth/login"; // Full reload (recommended if session must reset)
    }
  }, [showLoggedOutModal, router]);

  // Function to set up expiration timeout
  const setupExpirationTimeout = useCallback(
    (secondsUntilExpiration: number) => {
      if (expirationTimeoutRef.current) {
        clearTimeout(expirationTimeoutRef.current);
      }
      const timeUntilExpire = (secondsUntilExpiration + 10) * 1000;
      expirationTimeoutRef.current = setTimeout(() => {
        setExpired(true);
        if (!pathname?.includes("/auth")) {
          setShowLoggedOutModal(true);
        }
      }, timeUntilExpire);
    },
    [pathname]
  );

  // Clean up any timeouts/intervals when component unmounts
  useEffect(() => {
    return () => {
      if (expirationTimeoutRef.current) {
        clearTimeout(expirationTimeoutRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Set up token refresh logic if custom refresh URL exists
  useEffect(() => {
    if (!user) return;
    const secondsUntilExpiration = getSecondsUntilExpiration(user);
    if (secondsUntilExpiration === null) return;

    setupExpirationTimeout(secondsUntilExpiration);

    if (NEXT_PUBLIC_CUSTOM_REFRESH_URL) {
      const refreshUrl = NEXT_PUBLIC_CUSTOM_REFRESH_URL;

      const attemptTokenRefresh = async () => {
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            const refreshTokenData = await refreshToken(refreshUrl);
            if (!refreshTokenData) throw new Error("Failed to refresh token");

            const response = await fetch(
              "/api/enterprise-settings/refresh-token",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(refreshTokenData),
              }
            );
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            // wait for backend to process
            await new Promise((resolve) => setTimeout(resolve, 4000));

            const updatedUser = await mutateUser();
            if (updatedUser) {
              const newSeconds = getSecondsUntilExpiration(updatedUser);
              if (newSeconds !== null) {
                setupExpirationTimeout(newSeconds);
                console.debug(
                  `Token refreshed, new expiration in ${newSeconds} seconds`
                );
              }
            }
            break; // success
          } catch (error) {
            console.error(
              `Error refreshing token (attempt ${retryCount + 1}/3):`,
              error
            );
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount) * 1000)
              );
            }
          }
        }
      };

      // refresh interval (15 mins)
      const refreshInterval = 60 * 15;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(
        attemptTokenRefresh,
        refreshInterval * 1000
      );

      if (secondsUntilExpiration < refreshInterval) {
        attemptTokenRefresh();
      }
    }
  }, [user, setupExpirationTimeout, mutateUser]);

  // If backend is fine and session not expired → show nothing
  if (!error && !expired) return null;

  // Backend unavailable or expired
  if (error instanceof RedirectError || expired) {
    if (!pathname?.includes("/auth")) {
      setShowLoggedOutModal(true);
    }
    return null;
  }

  // Show health banner if backend unavailable
  return (
    <div className="fixed top-0 left-0 z-[101] w-full text-xs mx-auto bg-gradient-to-r from-red-900 to-red-700 p-2 rounded-sm border-hidden text-neutral-50 dark:text-neutral-100">
      <p className="font-bold pb-1">The backend is currently unavailable.</p>
      <p className="px-1">
        If this is your initial setup or you just updated your Onyx deployment,
        this is likely because the backend is still starting up. Give it a
        minute or two, and then refresh the page. If that does not work, make
        sure the backend is setup and/or contact an administrator.
      </p>
    </div>
  );
};
