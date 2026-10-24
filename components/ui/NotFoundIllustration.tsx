'use client';

import React from 'react';

interface NotFoundIllustrationProps {
  className?: string;
}

export function NotFoundIllustration({ className = '' }: NotFoundIllustrationProps) {
  return (
    <div
      className={`relative w-full max-w-[580px] aspect-[580/380] select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 580 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        role="presentation"
      >
        <defs>
          {/* Subtle glow filter or markers if needed */}
          <style>
            {`
              @media (prefers-reduced-motion: no-preference) {
                .animate-draw-line {
                  stroke-dasharray: 600;
                  stroke-dashoffset: 600;
                  animation: drawLine 850ms cubic-bezier(0.25, 1, 0.5, 1) forwards 200ms;
                }
                .animate-fade-marker {
                  opacity: 0;
                  animation: fadeIn 300ms ease forwards 900ms;
                }
              }
              @keyframes drawLine {
                to {
                  stroke-dashoffset: 0;
                }
              }
              @keyframes fadeIn {
                to {
                  opacity: 1;
                }
              }
            `}
          </style>
        </defs>

        {/* 1. Background subtle dots & decorative trajectory */}
        <g className="text-slate-200 dark:text-slate-800">
          {/* Subtle constellation dots */}
          <circle cx="85" cy="110" r="3" fill="currentColor" opacity="0.6" />
          <circle cx="160" cy="70" r="2.5" fill="currentColor" opacity="0.5" />
          <circle cx="390" cy="85" r="3.5" fill="currentColor" opacity="0.7" />
          <circle cx="495" cy="120" r="2.5" fill="currentColor" opacity="0.5" />
          <circle cx="515" cy="270" r="3" fill="currentColor" opacity="0.6" />
          <circle cx="110" cy="310" r="2" fill="currentColor" opacity="0.4" />
          <circle cx="280" cy="350" r="2.5" fill="currentColor" opacity="0.5" />

          {/* Faint dashed exploratory trajectory */}
          <path
            d="M 95 125 C 180 80, 270 90, 360 110 S 490 190, 520 250"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>

        {/* 2. Bold 404 Typography rendered as crisp SVG text/shapes */}
        <g
          className="fill-[#171A21] dark:fill-[#F1F5F9] transition-colors duration-150"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {/* First "4" */}
          <text
            x="70"
            y="265"
            fontSize="210"
            fontWeight="900"
            fontFamily="var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-8px"
            className="tracking-tighter"
          >
            4
          </text>

          {/* Central "0" */}
          <text
            x="215"
            y="265"
            fontSize="210"
            fontWeight="900"
            fontFamily="var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-8px"
            className="tracking-tighter"
          >
            0
          </text>

          {/* Second "4" */}
          <text
            x="365"
            y="265"
            fontSize="210"
            fontWeight="900"
            fontFamily="var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-8px"
            className="tracking-tighter"
          >
            4
          </text>
        </g>

        {/* 3. Foreground Red Dynamic Curved Line (passing across the numbers) */}
        {/*
            Starts at (50, 195) with an open circle
            Curves up through (185, 175) -> peak (250, 150)
            Dips down through (345, 205) -> valley (435, 280)
            Rises to endpoint (535, 260) with an arrow and solid dot
        */}
        <path
          d="M 54 195 C 130 195, 190 152, 255 152 C 320 152, 365 210, 420 270 C 465 315, 500 290, 532 262"
          fill="none"
          stroke="#DC2626"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-line"
        />

        {/* Start point: Unfilled circle */}
        <circle
          cx="54"
          cy="195"
          r="5.5"
          fill="#F8FAFC"
          className="dark:fill-[#0B1220] transition-colors"
          stroke="#DC2626"
          strokeWidth="3"
        />

        {/* End point markers: Solid red dot and directional arrowhead */}
        <g className="animate-fade-marker">
          {/* Arrowhead at line end pointing forward-up (angle approx -35 deg) */}
          <path
            d="M 524 252 L 535 260 L 526 270"
            fill="none"
            stroke="#DC2626"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Final accent dot ahead of trajectory */}
          <circle cx="550" cy="250" r="4.5" fill="#DC2626" />
        </g>
      </svg>
    </div>
  );
}
