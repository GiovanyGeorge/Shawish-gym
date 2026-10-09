import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveProfilePhotoUrl } from "@/services/profilePhotoApi";
import { cn } from "@/utils/cn";

export function ProductThumbnail({
  name,
  imagePath,
  className,
}: {
  name: string;
  imagePath: string | null;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveProfilePhotoUrl(imagePath).then((resolved) => {
      if (!cancelled) setUrl(resolved.url);
    });
    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn("size-12 rounded-shawish border border-shawish-border object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-12 items-center justify-center rounded-shawish border border-shawish-border bg-shawish-bg/50 text-shawish-muted",
        className,
      )}
    >
      <Package className="size-5" />
    </div>
  );
}
