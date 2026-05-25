type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  title?: string;
};

/**
 * CaptionAI brand mark — a rounded speech bubble with a sparkle inside, drawn
 * with the app's purple/violet/fuchsia gradient. Rendered inline as SVG so it
 * scales crisp at any size and works as favicon, header, footer, and OG mark.
 */
export function BrandLogo({ className = "h-8 w-8", title = "CaptionAI" }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="captionai-bubble" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        <linearGradient id="captionai-spark" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fdf4ff" />
        </linearGradient>
      </defs>

      <path
        d="M11 6h26a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H22.7l-7.3 7a1.5 1.5 0 0 1-2.55-1.07V34H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5Z"
        fill="url(#captionai-bubble)"
      />

      <path
        d="M24 13.2l2.06 5.78a3.4 3.4 0 0 0 2.07 2.07L33.9 23.1l-5.78 2.06a3.4 3.4 0 0 0-2.07 2.07L24 32.99l-2.06-5.77a3.4 3.4 0 0 0-2.07-2.07L14.1 23.1l5.78-2.06a3.4 3.4 0 0 0 2.07-2.07L24 13.2Z"
        fill="url(#captionai-spark)"
      />

      <circle cx="33.5" cy="14.5" r="1.6" fill="#fff" opacity="0.85" />
      <circle cx="15" cy="30" r="1.1" fill="#fff" opacity="0.7" />
    </svg>
  );
}
