import { useEffect, useState } from "react";
import { resolveProfilePhotoUrl } from "@/services/profilePhotoApi";

export function useMemberPhotoUrl(relativePath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);

    if (!relativePath) {
      return;
    }

    void resolveProfilePhotoUrl(relativePath).then((result) => {
      if (!cancelled) {
        setUrl(result.url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [relativePath]);

  return url;
}
