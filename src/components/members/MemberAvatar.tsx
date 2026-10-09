import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useMemberPhotoUrl } from "@/hooks/useMemberPhotoUrl";
import { cn } from "@/utils/cn";

type MemberAvatarProps = {
  name: string;
  photoPath?: string | null;
  /** Direct preview URL (e.g. immediately after picking a file). */
  previewUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-base",
  xl: "size-24 text-xl",
};

export function MemberAvatar({
  name,
  photoPath,
  previewUrl,
  size = "md",
  className,
}: MemberAvatarProps) {
  const resolvedUrl = useMemberPhotoUrl(previewUrl ? null : photoPath);
  const src = previewUrl ?? resolvedUrl;
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-shawish-border bg-shawish-surface-elevated",
        sizeClasses[size],
        className,
      )}
      aria-hidden={!src}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : initials ? (
        <span className="flex size-full items-center justify-center font-semibold text-shawish-orange">
          {initials}
        </span>
      ) : (
        <span className="flex size-full items-center justify-center text-shawish-muted">
          <UserRound className="size-[45%]" />
        </span>
      )}
    </div>
  );
}
