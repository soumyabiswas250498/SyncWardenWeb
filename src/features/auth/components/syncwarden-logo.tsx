interface ShieldGlyphProps {
  stroke: string;
  size: number;
}

const ShieldGlyph = ({ stroke, size }: ShieldGlyphProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 15V4" />
    <path d="M7 8.5L12 3.5L17 8.5" />
    <path d="M4.5 14v3.5a2 2 0 002 2h11a2 2 0 002-2V14" />
  </svg>
);

interface SyncWardenLogoProps {
  /** "onBrand" renders the mark for the dark brand panel; "light" renders it for light backgrounds (mobile header). */
  tone: "onBrand" | "light";
}

export const SyncWardenLogo = ({ tone }: SyncWardenLogoProps) => {
  if (tone === "onBrand") {
    return (
      <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-white/[0.14]">
        <div className="sw-shield flex h-[21px] w-[19px] items-center justify-center bg-[oklch(0.99_0.003_85)] pb-0.5">
          <ShieldGlyph stroke="oklch(0.3 0.045 260)" size={11} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(155deg,oklch(0.6_0.15_250),oklch(0.42_0.13_258))]">
      <div className="sw-shield flex h-[19px] w-[17px] items-center justify-center bg-[oklch(0.99_0.003_85)] pb-0.5">
        <ShieldGlyph stroke="oklch(0.42 0.13 258)" size={10} />
      </div>
    </div>
  );
};
