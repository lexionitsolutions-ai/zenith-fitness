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
      if (!active || permissions.receive !== "granted") return;

      await PushNotifications.addListener("registration", (token: Token) => {
        void saveToken(token.value).catch(console.error);
      });

      await PushNotifications.addListener("registrationError", console.error);
      await PushNotifications.register();
    }

    void register().catch(console.error);

    return () => {
      active = false;
      void PushNotifications.removeAllListeners();
    };
  }, []);

  return null;
}
