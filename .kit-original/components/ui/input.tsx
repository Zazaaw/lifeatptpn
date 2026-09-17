import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — h-9 to match Button's default height, so a field and a button sit
 * flush side by side in a row without manual alignment.
 *
 * `bg-transparent` (not bg-background) lets the input inherit whatever
 * surface it sits on — important inside cards, which may be a different
 * shade than the page.
 *
 * Focus uses `ring-1` rather than a heavier 2px ring: quieter, and it doesn't
 * shift layout since the ring draws outside the box.
 *
 * v4 note: `outline-hidden` replaces v3's `outline-none`. In v4,
 * `outline-none` literally sets `outline: none`, which removes the focus
 * indicator in forced-colors mode; `outline-hidden` preserves it.
 */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
