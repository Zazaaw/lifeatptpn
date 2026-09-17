import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — the base surface. Composed from six parts so padding and spacing
 * stay consistent no matter what goes inside:
 *
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>Title</CardTitle>
 *       <CardDescription>Supporting line.</CardDescription>
 *     </CardHeader>
 *     <CardContent>…</CardContent>
 *     <CardFooter><Button>Action</Button></CardFooter>
 *   </Card>
 *
 * Note the padding rhythm: Header is `p-6`, while Content and Footer are
 * `p-6 pt-0`. That avoids doubled vertical gaps between stacked sections —
 * the header's bottom padding already separates them.
 *
 * This is the neutral base. For the heavier bordered look used across list
 * and dashboard screens, see the "elevated card" recipe in the README:
 *   rounded-xl border border-neutral-200 bg-white shadow-xs
 *   dark:border-neutral-800 dark:bg-neutral-900/50
 *
 * v4 note: the shadow scale shifted by one step — v3's `shadow` is now
 * `shadow-sm`, and v3's `shadow-sm` is now `shadow-xs`.
 */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
