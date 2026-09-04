"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

type ScannerInstance = {
  start: (
    cameraConfig: { facingMode: "environment" } | string,
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (value: string) => void,
    onError?: () => void
  ) => Promise<null>;
  stop: () => Promise<void>;
  clear: () => void;
};

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const scanner = useRef<ScannerInstance | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  async function startScanner() {
    setMessage("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode("zenith-qr-reader") as ScannerInstance;
      scanner.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (value) => {
          onScan(value);
          await instance.stop().catch(() => {});
          instance.clear();
          scanner.current = null;
          setActive(false);
        },
        () => {}
      );
      setActive(true);
    } catch {
      setMessage("Unable to start camera. Check browser camera permission and try again.");
      setActive(false);
    }
  }

  async function stopScanner() {
    const instance = scanner.current;
    if (!instance) return;
    await instance.stop().catch(() => {});
    instance.clear();
    scanner.current = null;
    setActive(false);
  }

  useEffect(() => {
    void startScanner();
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="mt-4">
      <div id="zenith-qr-reader" className="min-h-64 overflow-hidden rounded-2xl bg-black/25 text-black" />
      <button type="button" onClick={active ? stopScanner : startScanner} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 font-bold">
        {active ? <CameraOff size={18} /> : <Camera size={18} />}
        {active ? "Stop camera" : "Start back camera"}
      </button>
      {message && <p className="mt-2 text-sm text-amber-200">{message}</p>}
    </div>
  );
}
