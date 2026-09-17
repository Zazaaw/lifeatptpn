import { cn } from "@/lib/utils";
import React from "react";

/**
 * Typography — a namespace of text primitives.
 *
 * WHY THIS EXISTS
 * Raw <h1>/<p> drift: one page uses text-3xl, another text-2xl, a third adds
 * tracking. Funneling every piece of text through these keeps scale, weight,
 * and letter-spacing consistent across the whole site.
 *
 * USAGE
 *   <Typography.H3 className="text-3xl font-bold">Projects</Typography.H3>
 *   <Typography.P className="text-muted-foreground">Subtitle here.</Typography.P>
 *
 * Every component merges an incoming `className` LAST, so overriding the
 * default size (as the page-header pattern does with H3) works cleanly.
 *
 * `scroll-m-20` on the headings reserves margin for anchor-link jumps, so a
 * heading never lands flush against a sticky header.
 */

const Typography = () => {
  return null;
};

const TypographyH1 = ({ children, className, ...props }: any) => {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
};
Typography.H1 = TypographyH1;

const TypographyH2 = ({ children, className, ...props }: any) => {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
};
Typography.H2 = TypographyH2;

const TypographyH3 = ({ children, className, ...props }: any) => {
  return (
    <h3
      className={cn(
        "mt-8 scroll-m-20 text-2xl font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
};
Typography.H3 = TypographyH3;

const TypographyH4 = ({ children, className, ...props }: any) => {
  return (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  );
};
Typography.H4 = TypographyH4;

const TypographyP = ({ children, className, ...props }: any) => {
  return (
    <p className={cn("leading-7", className)} {...props}>
      {children}
    </p>
  );
};
Typography.P = TypographyP;

const TypographyBlockquote = ({ children, className, ...props }: any) => {
  return (
    <blockquote
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    >
      {children}
    </blockquote>
  );
};
Typography.quote = TypographyBlockquote;

export default Typography;
