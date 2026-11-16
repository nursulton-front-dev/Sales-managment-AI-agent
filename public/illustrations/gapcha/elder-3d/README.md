# gapcha AI elder mascot

Runtime images are transparent WebP derivatives of the original PNGs in `docs/design/gapcha-companion/mascot-3d/`.

| File | Source pose | Interface use |
| --- | --- | --- |
| `hello.webp` | `hello.png` | Overview welcome, agent setup, and product demo |
| `success.webp` | `success.png` | Completed agent setup |
| `support.webp` | `support.png` | Support page and the nearest available pose for loading, empty, error, and 404 states |
| `avatar.webp` | Head crop from `hello.png` | Small wizard assistant avatar |

The original source artwork remains in the design folder. Interface motion is a short whole-image CSS transform; the PNGs do not contain separately animated limbs or facial layers. Motion stops under `prefers-reduced-motion` and can be disabled per instance with `animate={false}`.
