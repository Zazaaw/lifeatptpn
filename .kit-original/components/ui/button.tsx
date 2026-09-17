"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — Tailwind v4.
 *
 * NOTE: the original in the portfolio also fires UI sound cues on click and
 * hover via a SoundProvider. That dependency is stripped here so the button
 * drops into any project. To restore it, see README §"Adding sound".
 *
 * The base string carries everything shared: layout, radius, text scale,
 * transition, focus ring, and disabled state. Variants only change color.
 *
 * `asChild` renders a Radix Slot instead of a <button>, so you can style a
 * Next.js <Link> as a button without nesting an <a> inside a <button>:
 *
 *   <Button asChild><Link href="/contacts">Contact me</Link></Button>
 *
 * v4 notes:
 *  - `shrink-0` on the SVG child: v4 no longer normalises flex children the
 *    way v3 did, so an icon in a flex button can squash without it.
 *  - `outline-hidden` replaces v3's `outline-none` (which now means
 *    "outline: none" literally and hurts forced-colors accessibility).
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Solid — the one primary action on a screen.
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // Bordered — secondary actions that still need to look clickable.
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        // Filled but quiet — also the "active nav item" look.
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        // No chrome until hover — toolbars, icon buttons, nav rows.
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// `buttonVariants` is exported so non-button elements can borrow the styling:
//   <Link className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} />
export { Button, buttonVariants };
