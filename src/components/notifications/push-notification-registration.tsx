"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token } from "@capacitor/push-notifications";

const registeredTokenKey = "zenith.pushToken";

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
  window.localStorage.setItem(registeredTokenKey, token);
  console.info("[push] device token registered");
}

export async function unregisterPushNotifications() {
  const token = window.localStorage.getItem(registeredTokenKey);
  if (!token) return;

  await fetch("/api/member/notifications/devices", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  window.localStorage.removeItem(registeredTokenKey);
}

export function PushNotificationRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    async function register() {
      const permissions = await PushNotifications.requestPermissions();
      if (!active) return;
      if (permissions.receive !== "granted") {
        console.info("[push] notification permission not granted", permissions.receive);
        return;
      }

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
        cleanupListeners = cleanup;
      })
      .catch(console.error);

    return () => {
      active = false;
      cleanupListeners?.();
    };
  }, []);

  return null;
}
