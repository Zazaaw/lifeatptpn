import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The single most-used helper in the whole system.
 *
 * `clsx` handles conditionals and arrays; `twMerge` resolves Tailwind
 * conflicts so a later class actually wins:
 *
 *   cn("px-4 py-2", "px-8")            → "py-2 px-8"     (not both px)
 *   cn("text-sm", isBig && "text-lg")  → "text-lg"        when isBig
 *
 * Without twMerge, `className` overrides passed into a component would fight
 * the component's own defaults instead of replacing them. Every component in
 * this kit accepts a `className` prop and pipes it through cn() last, so
 * callers can always override.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
