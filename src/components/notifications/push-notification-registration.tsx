"use client";

import { useEffect } from "react";
import { safeLocalStorage } from "@/lib/browser-storage";
import { Capacitor } from "@capacitor/core";
import type { Token } from "@capacitor/push-notifications";

const registeredTokenKey = "zenith.pushToken";
const androidChannelId = "zenith_updates";

async function ensureAndroidNotificationChannel() {
  if (Capacitor.getPlatform() !== "android") return;

  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.createChannel({
    id: androidChannelId,
    name: "Zenith Updates",
    description: "Membership, workout, points, and gym updates from Zenith Fitness.",
    importance: 4,
    visibility: 1,
    lights: true,
    lightColor: "#e5c553",
    vibration: true,
  });
}

async function saveToken(token: string) {
  const platform = Capacitor.getPlatform() === "ios" ? "IOS" : "ANDROID";

  const response = await fetch("/api/member/notifications/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token,
      platform,
      provider: "FCM",
    }),
  });

  if (!response.ok) throw new Error("Could not register push notification token.");
  safeLocalStorage.setItem(registeredTokenKey, token);
  console.info("[push] device token registered");
}

export async function unregisterPushNotifications() {
  const token = safeLocalStorage.getItem(registeredTokenKey);
  if (!token) return;

  await fetch("/api/member/notifications/devices", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  safeLocalStorage.removeItem(registeredTokenKey);
}

export function PushNotificationRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    async function register() {
      // Web users never download the native notification bridge.
      const { PushNotifications } = await import("@capacitor/push-notifications");
      if (!active) return;
      const permissions = await PushNotifications.requestPermissions();
      if (!active) return;
      if (permissions.receive !== "granted") {
        console.info("[push] notification permission not granted", permissions.receive);
        return;
      }

      await ensureAndroidNotificationChannel();

      const registrationListener = await PushNotifications.addListener("registration", (token: Token) => {
        void saveToken(token.value).catch(console.error);
      });

      const registrationErrorListener = await PushNotifications.addListener("registrationError", (error) => {
        console.error("[push] registration failed", error);
      });

      const receivedListener = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.info("[push] notification received", notification);
      });

      await PushNotifications.register();

      return () => {
        void registrationListener.remove();
        void registrationErrorListener.remove();
        void receivedListener.remove();
      };
    }

    let cleanupListeners: (() => void) | undefined;
    void register()
      .then((cleanup) => {
        if (!active) cleanup?.();
        else cleanupListeners = cleanup;
      })
      .catch(console.error);

    return () => {
      active = false;
      cleanupListeners?.();
    };
  }, []);

  return null;
}
