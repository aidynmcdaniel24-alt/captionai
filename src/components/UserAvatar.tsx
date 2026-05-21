type UserAvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const emailLocal = (email ?? "").split("@")[0];
  if (emailLocal) {
    return emailLocal.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function UserAvatar({ imageUrl, name, email, size = "md", className = "" }: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const ringClass =
    "ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-provided from Clerk
      <img
        src={imageUrl}
        alt={name ? `${name} avatar` : "Profile photo"}
        className={`${sizeClass} ${ringClass} ${className} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} ${ringClass} ${className} inline-flex select-none items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 font-semibold uppercase text-white`}
    >
      {getInitials(name, email)}
    </span>
  );
}
