"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";

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

// `buttonVariants` is re-exported so non-button elements can borrow the styling:
//   <Link className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} />
// lifeatptpn-insight: it lives in ./button-variants (no "use client") so Server
// Components can call it too; importing it from this client module cannot.
export { Button, buttonVariants };
