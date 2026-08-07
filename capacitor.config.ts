import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zenithfitness.app",
  appName: "Zenith Fitness",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://zenith-fitness-theta.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#07110e",
  },
};

export default config;
