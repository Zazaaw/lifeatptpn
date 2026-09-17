import { cva } from "class-variance-authority";

/**
 * Button styling, split out of button.tsx.
 *
 * button.tsx is a Client Component ("use client"), and a function exported
 * from a client module cannot be CALLED from a Server Component. Pages here
 * style <Link> as buttons on the server (pagination, back links), so the
 * variants live in this plain module that both sides can import.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-body-sm font-medium transition-[color,background-color,transform] outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
          "border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground",
        // Filled but quiet — also the "active nav item" look.
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        // No chrome until hover — toolbars, icon buttons, nav rows.
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-caption",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export { buttonVariants };

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
