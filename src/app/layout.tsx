import "./globals.css";
import type { Metadata, Viewport } from "next";
import { MobileNavigationGestures } from "@/components/layout/mobile-navigation-gestures";
import { PushNotificationRegistration } from "@/components/notifications/push-notification-registration";

export const metadata: Metadata = {
  title: { default: "Zenith Fitness", template: "%s - Zenith Fitness" },
  description: "Your Zenith Fitness membership companion",
  applicationName: "Zenith Fitness",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/icon-192.png",
    apple: "/brand/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: "Zenith Fitness",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#07110e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PushNotificationRegistration />
        <MobileNavigationGestures />
        {children}
      </body>
    </html>
  );
}
