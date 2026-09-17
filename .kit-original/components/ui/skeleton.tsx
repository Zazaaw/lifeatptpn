import { cn } from "@/lib/utils";

/**
 * Skeleton — a pulsing placeholder block.
 *
 * `bg-primary/10` rather than a fixed grey: it derives from the theme, so it
 * works in light AND dark without a second class.
 *
 * THE RULE THAT MATTERS: a skeleton must mirror the real layout of the page
 * it stands in for — same number of blocks, same rough sizes, same grid.
 * A generic centered spinner makes the page appear to jump when content
 * lands; a matching skeleton makes it appear to resolve.
 *
 *   // good — mirrors a 2-column card grid
 *   <div className="grid gap-5 sm:grid-cols-2">
 *     {Array.from({ length: 4 }).map((_, i) => (
 *       <Skeleton key={i} className="h-48 rounded-xl" />
 *     ))}
 *   </div>
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
