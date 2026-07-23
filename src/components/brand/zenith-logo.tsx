import Image from "next/image";

type ZenithLogoProps = {
  className?: string;
  priority?: boolean;
  compact?: boolean;
};

export function ZenithLogo({
  className = "",
  priority = false,
  compact = false,
}: ZenithLogoProps) {
  return (
    <Image
      src="/brand/zenith-fitness-logo.png"
      alt="Zenith Fitness"
      width={457}
      height={415}
      priority={priority}
      className={`${compact ? "h-12 w-auto" : "h-auto w-full"} object-contain ${className}`}
    />
  );
}
