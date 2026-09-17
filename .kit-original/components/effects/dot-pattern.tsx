"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * DotPattern — an SVG dot grid used as an ambient page background.
 *
 * Requires:  npm i framer-motion
 *
 * Pair it with a mask so it fades out instead of tiling edge-to-edge — an
 * un-masked pattern reads as noise; a masked one reads as texture. See the
 * "ambient background" recipe in the README for the exact two-layer setup.
 *
 *   <DotPattern
 *     width={20} height={20} cx={1} cy={1} cr={1}
 *     className="[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
 *   />
 *
 * Color comes from `currentColor`, so control it with a text utility:
 *   className="text-neutral-400/60"
 *
 * `glow` makes the dots pulse at randomized intervals. Leave it off for a
 * background; it's better suited to a small hero panel.
 *
 * Perf note: this renders one <circle> per dot. Over a full viewport at tight
 * spacing that's thousands of nodes. Keep `width`/`height` at 16–24px or
 * larger, and don't enable `glow` full-screen.
 */

interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  /** Horizontal spacing between dots. */
  width?: number;
  /** Vertical spacing between dots. */
  height?: number;
  /** X-offset of the whole pattern. */
  x?: number;
  /** Y-offset of the whole pattern. */
  y?: number;
  /** X-offset of each individual dot within its cell. */
  cx?: number;
  /** Y-offset of each individual dot within its cell. */
  cy?: number;
  /** Radius of each dot. */
  cr?: number;
  className?: string;
  /** Pulse the dots at randomized delays. Costly at full-screen sizes. */
  glow?: boolean;
  [key: string]: unknown;
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const dots = Array.from(
    {
      length:
        Math.ceil(dimensions.width / width) *
        Math.ceil(dimensions.height / height),
    },
    (_, i) => {
      const col = i % Math.ceil(dimensions.width / width);
      const row = Math.floor(i / Math.ceil(dimensions.width / width));
      return {
        x: col * width + cx + x,
        y: row * height + cy + y,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      };
    }
  );

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-neutral-400/80",
        className
      )}
      {...props}
    >
      <defs>
        <radialGradient id={`${id}-gradient`}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots.map((dot) => (
        <motion.circle
          key={`${dot.x}-${dot.y}`}
          cx={dot.x}
          cy={dot.y}
          r={cr}
          fill={glow ? `url(#${id}-gradient)` : "currentColor"}
          initial={glow ? { opacity: 0.4, scale: 1 } : {}}
          animate={
            glow
              ? {
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.5, 1],
                }
              : {}
          }
          transition={
            glow
              ? {
                  duration: dot.duration,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: dot.delay,
                  ease: "easeInOut",
                }
              : {}
          }
        />
      ))}
    </svg>
  );
}

export default DotPattern;
