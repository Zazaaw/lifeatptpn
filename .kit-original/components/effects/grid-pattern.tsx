"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * GridPattern — a line grid where random cells softly light up and fade.
 *
 * Requires:  npm i framer-motion
 *
 * This is the second half of the ambient background. Layered under DotPattern
 * with an opposing mask, the two create depth without either being noticeable
 * on its own.
 *
 *   <GridPattern
 *     width={50} height={50} duration={15} repeatDelay={1}
 *     maxOpacity={0.1} x={-1} y={-1}
 *     className="[mask-image:linear-gradient(to_top_left,white,transparent,transparent)]"
 *   />
 *
 * Keep `maxOpacity` low (0.05–0.15). Above that the twinkle competes with
 * your content instead of sitting behind it.
 *
 * The x/y of -1 nudges the grid so lines land on whole pixels — without it,
 * 1px strokes render blurry on some displays.
 */

interface GridPatternProps {
  /** Cell width in px. */
  width?: number;
  /** Cell height in px. */
  height?: number;
  /** Pattern x-offset. -1 keeps 1px lines crisp. */
  x?: number;
  /** Pattern y-offset. -1 keeps 1px lines crisp. */
  y?: number;
  /** Pass a value for dashed grid lines. */
  strokeDasharray?: any;
  /** How many cells twinkle at once. */
  numSquares?: number;
  className?: string;
  /** Peak opacity of a lit cell. Keep low — 0.1 is a good default. */
  maxOpacity?: number;
  /** Seconds for one fade cycle. Higher = slower, calmer. */
  duration?: number;
  repeatDelay?: number;
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: GridPatternProps) {
  const id = useId();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState(() => generateSquares(numSquares));

  function getPos() {
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  }

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  // When a square finishes its fade, teleport it somewhere new. That's what
  // makes the twinkle endless without ever re-running the whole animation.
  const updateSquarePosition = (id: number) => {
    setSquares((currentSquares) =>
      currentSquares.map((sq) =>
        sq.id === id
          ? {
              ...sq,
              pos: getPos(),
            }
          : sq
      )
    );
  };

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [containerRef]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            key={`${x}-${y}-${index}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}

export default GridPattern;
