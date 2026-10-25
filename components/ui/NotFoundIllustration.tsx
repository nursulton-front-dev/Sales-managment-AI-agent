'use client';

import React from 'react';

interface NotFoundIllustrationProps {
  className?: string;
}

/**
 * Pixel-accurate SVG illustration recreating 404-reference.png:
 * - Ultra-bold 404 graphite numerals with authentic geometry
 * - Background faint dashed trajectory (#CBD5E1 in light, #334155 in dark) with hollow nodes
 * - Red route starting with open hollow circle on the left, curving upwards across first '4',
 *   descending gracefully through '0', and sweeping rightwards through second '4' towards arrowhead and accent dot.
 * - Underneath the red path is a slightly thicker crisp mask/buffer line (#FFFFFF / dark surface) so the red line pops distinctly over dark numbers.
 */
export function NotFoundIllustration({ className = '' }: NotFoundIllustrationProps) {
  // viewBox: 640 x 420
  // Digits: 4 (left 75..230), 0 (center 245..395), 4 (right 410..565)
  // Base line y=330, cap height 240, height 230
  // Red route:
  // Starts at x=55, y=210 (hollow circle)
  // Curves over first '4': control (150, 210) -> peak (250, 155)
  // Descends through center '0': control (320, 155) -> valley (435, 295)
  // Sweeps right through second '4': control (490, 360) -> end (585, 345)
  // Arrowhead at (585, 345) + solid red dot at (608, 342)

  return (
    <div
      className={`relative w-full max-w-[680px] aspect-[640/420] select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 640 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        role="presentation"
      >
        <defs>
          <style>
            {`
              @media (prefers-reduced-motion: no-preference) {
                .animate-path-dash {
                  stroke-dasharray: 850;
                  stroke-dashoffset: 850;
                  animation: drawRoute 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards 150ms;
                }
                .animate-point-fade {
                  opacity: 0;
                  animation: fadeInMarker 350ms ease forwards 850ms;
                }
              }
              @keyframes drawRoute {
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes fadeInMarker {
                to {
                  opacity: 1;
                }
              }
            `}
          </style>
        </defs>

        {/* 1. Background Secondary Trajectory with Hollow Nodes */}
        <g className="text-[#CBD5E1] dark:text-[#334155] transition-colors duration-150">
          {/* Dashed curved arc flowing behind the numbers */}
          <path
            d="M 40 310 C 120 180, 240 70, 395 85 C 490 95, 570 180, 600 270"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeDasharray="6 8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Secondary subtle branch */}
          <path
            d="M 230 380 C 270 330, 350 360, 420 375"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="5 7"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />

          {/* Hollow circular nodes on background trajectory */}
          {/* Node 1: Top center-right */}
          <circle
            cx="395"
            cy="85"
            r="8.5"
            stroke="currentColor"
            strokeWidth="2.4"
            fill="#F8FAFC"
            className="dark:fill-[#0B1220] transition-colors"
          />

          {/* Node 2: Bottom center */}
          <circle
            cx="285"
            cy="355"
            r="8"
            stroke="currentColor"
            strokeWidth="2.2"
            fill="#F8FAFC"
            className="dark:fill-[#0B1220] transition-colors"
          />

          {/* Node 3: Right exit */}
          <circle
            cx="580"
            cy="245"
            r="6.5"
            stroke="currentColor"
            strokeWidth="2"
            fill="#F8FAFC"
            className="dark:fill-[#0B1220] transition-colors"
          />

          {/* Node 4: Left start */}
          <circle
            cx="85"
            cy="240"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            fill="#F8FAFC"
            className="dark:fill-[#0B1220] transition-colors"
          />
        </g>

        {/* 2. Bold 404 Typography rendered as solid crisp SVG geometry */}
        <g
          className="fill-[#171A21] dark:fill-[#F1F5F9] transition-colors duration-150"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {/* First "4" */}
          <text
            x="68"
            y="315"
            fontSize="248"
            fontWeight="900"
            fontFamily="Inter, var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-10px"
          >
            4
          </text>

          {/* Center "0" */}
          <text
            x="240"
            y="315"
            fontSize="248"
            fontWeight="900"
            fontFamily="Inter, var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-10px"
          >
            0
          </text>

          {/* Second "4" */}
          <text
            x="414"
            y="315"
            fontSize="248"
            fontWeight="900"
            fontFamily="Inter, var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-10px"
          >
            4
          </text>
        </g>

        {/* 3. White/Surface Buffer Line under the Red Path for crisp legibility over numbers */}
        <path
          d="M 55 210 C 145 210, 195 155, 260 155 C 335 155, 385 220, 440 295 C 485 350, 535 365, 578 348"
          fill="none"
          stroke="#F8FAFC"
          className="dark:stroke-[#0B1220] transition-colors"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 4. Foreground Vibrant Red Route */}
        <path
          d="M 55 210 C 145 210, 195 155, 260 155 C 335 155, 385 220, 440 295 C 485 350, 535 365, 578 348"
          fill="none"
          stroke="#DC2626"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-path-dash"
        />

        {/* 5. Start Point: Hollow red circle with background-colored core */}
        <circle
          cx="55"
          cy="210"
          r="6.5"
          fill="#F8FAFC"
          className="dark:fill-[#0B1220] transition-colors"
          stroke="#DC2626"
          strokeWidth="3.6"
        />

        {/* 6. End Point: Directional Arrowhead & Accent Red Dot */}
        <g className="animate-point-fade">
          {/* Arrowhead chevron pointing forward at exit */}
          <path
            d="M 567 339 L 579 348 L 569 359"
            fill="none"
            stroke="#DC2626"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Accent red dot placed slightly ahead of the route arrow */}
          <circle cx="598" cy="345" r="4.8" fill="#DC2626" />
        </g>
      </svg>
    </div>
  );
}
