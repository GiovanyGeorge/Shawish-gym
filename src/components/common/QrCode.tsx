import { useMemo } from "react";
import { qrSvgMarkup } from "@/utils/qrSvg";
import { cn } from "@/utils/cn";

export function QrCode({
  value,
  size = 140,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const svg = useMemo(() => qrSvgMarkup(value, size), [value, size]);
  return (
    <div
      className={cn("inline-flex rounded-shawish bg-white p-2", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
