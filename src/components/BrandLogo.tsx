import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className = "h-8 w-8", priority }: BrandLogoProps) {
  return (
    <Image
      src="/captionai-logo.png"
      alt="CaptionAI"
      width={36}
      height={36}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}
