import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function BrandLogo({
  href = "/",
  className,
  markClassName,
  textClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center border border-current font-mono text-[10px] font-bold leading-none",
          markClassName
        )}
      >
        sr
      </span>
      <span className={cn("font-bold text-[15px] tracking-tight", textClassName)}>
        silk resolve
      </span>
    </>
  );

  if (!href) {
    return <div className={cn("flex items-center gap-2", className)}>{content}</div>;
  }

  return (
    <Link href={href} className={cn("flex items-center gap-2 group", className)}>
      {content}
    </Link>
  );
}
