import { LoginForm } from "@/components/auth/login-form";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#332b10,#07110e_48%)] px-5 py-12">
      <section className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <ZenithLogo
            priority
            className="mx-auto max-w-[240px] drop-shadow-[0_12px_35px_rgba(229,197,83,.2)]"
          />
          <h1 className="sr-only">Welcome to Zenith Fitness</h1>
          <p className="mt-3 text-sm text-white/60">
            Your membership, always within reach.
          </p>
        </div>
        <LoginForm />
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/45">
          <Link href="/privacy" className="min-h-8 py-2 underline-offset-4 hover:text-white hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="min-h-8 py-2 underline-offset-4 hover:text-white hover:underline">
            Terms & Support
          </Link>
        </footer>
      </section>
    </main>
  );
}
