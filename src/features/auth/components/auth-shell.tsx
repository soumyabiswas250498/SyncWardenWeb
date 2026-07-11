import type { ReactNode } from "react";
import { SyncWardenLogo } from "./syncwarden-logo";

const FEATURES = [
  "Peer-to-peer transfer on your local network",
  "End-to-end control — you own the backend",
  "Works with Chrome, Android, and iOS",
];

interface AuthShellProps {
  children: ReactNode;
}

export const AuthShell = ({ children }: AuthShellProps) => (
  <div className="sw-auth flex min-h-svh w-full bg-background font-sans text-foreground">
    <div className="hidden min-h-svh w-[42%] max-w-[480px] flex-col justify-between bg-[linear-gradient(160deg,oklch(0.32_0.05_255),oklch(0.24_0.045_260))] p-12 min-[900px]:flex">
      <div className="flex items-center gap-2.5">
        <SyncWardenLogo tone="onBrand" />
        <span className="text-[19px] font-bold tracking-tight text-[oklch(0.98_0.005_85)]">SyncWarden</span>
      </div>

      <div className="max-w-[380px]">
        <div className="mb-3.5 text-[30px] leading-[1.25] font-bold tracking-tight text-[oklch(0.98_0.005_85)]">
          Your files and clipboard, everywhere you are.
        </div>
        <div className="text-[15px] leading-relaxed text-[oklch(0.82_0.02_250)]">
          Self-hosted sync across your phone, laptop, and browser — fast local transfers when
          you&apos;re on the same network, secure delivery when you&apos;re not.
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {FEATURES.map((feature) => (
          <div key={feature} className="flex items-center gap-2.5 text-[13.5px] text-[oklch(0.88_0.02_250)]">
            <span className="size-[7px] shrink-0 rounded-full bg-[oklch(0.72_0.17_145)]" />
            {feature}
          </div>
        ))}
      </div>
    </div>

    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex items-center justify-center gap-2.5 min-[900px]:hidden">
          <SyncWardenLogo tone="light" />
          <span className="text-[17px] font-bold tracking-tight">SyncWarden</span>
        </div>
        {children}
      </div>
    </div>
  </div>
);
