"use client";

import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  UseInViewOptions,
  Variants,
} from "framer-motion";

/**
 * BlurFade — the signature entrance of this design system.
 *
 * Content fades in while un-blurring and drifting up slightly. It's the single
 * highest-leverage component here: wrapping each page body in one instantly
 * gives the whole site its calm, considered feel.
 *
 * Requires:  npm i framer-motion
 *
 * TWO MODES
 *   inView={false}  (default) — animates immediately on mount.
 *                   Use for above-the-fold content / whole page bodies.
 *   inView={true}   — waits until scrolled into view.
 *                   Use for sections further down the page.
 *
 * USAGE
 *   // page body
 *   <BlurFade><YourPage /></BlurFade>
 *
 *   // section that reveals on scroll
 *   <BlurFade inView className="space-y-3"><Section /></BlurFade>
 *
 *   // staggered list — delay each item slightly
 *   {items.map((it, i) => (
 *     <BlurFade key={it.id} inView delay={i * 0.05}><Card {...it} /></BlurFade>
 *   ))}
 *
 * `once: true` means it never replays on scroll-back — replaying reads as a
 * glitch rather than an effect.
 */

type MarginType = UseInViewOptions["margin"];

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  /** Seconds. 0.4 default; 0.5–0.6 feels more deliberate for hero content. */
  duration?: number;
  /** Seconds to wait before starting — stagger lists with `i * 0.05`. */
  delay?: number;
  /** Vertical travel in px. Keep it small; large values feel like a slide. */
  yOffset?: number;
  /** true = wait for scroll-into-view. false = animate on mount. */
  inView?: boolean;
  /** Negative margin fires the trigger slightly before the element is visible. */
  inViewMargin?: MarginType;
  /** Starting blur. "6px" default, "10px" for a softer, slower reveal. */
  blur?: string;
}

export default function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;

  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: `blur(0px)` },
  };
  const combinedVariants = variant || defaultVariants;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          // The tiny 0.04 base delay lets the browser paint one frame first,
          // which prevents a flash of un-animated content on fast loads.
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
