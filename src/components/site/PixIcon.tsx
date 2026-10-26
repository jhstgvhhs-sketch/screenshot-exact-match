import type { ComponentProps } from "react";

/** Compact Pix symbol; presentation only, with no payment behavior. */
export function PixIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="-4 -4 40 40" fill="currentColor" aria-hidden="true" {...props}>
      <g transform="rotate(45 16 16)">
        <rect x="3" y="3" width="12" height="12" rx="3" />
        <rect x="17" y="3" width="12" height="12" rx="3" />
        <rect x="3" y="17" width="12" height="12" rx="3" />
        <rect x="17" y="17" width="12" height="12" rx="3" />
      </g>
    </svg>
  );
}
