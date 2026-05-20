// lib/logo-overlay.ts — Apply brand logo overlay to generated images
// Uses sharp for high-quality, pixel-perfect compositing

import sharp from "sharp";

export type OverlayPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface LogoOverlayOptions {
  position?: OverlayPosition;
  // Logo width as percentage of base image width (5-30)
  sizePercent?: number;
  // Padding from edge in pixels (will be scaled relative to base)
  paddingPercent?: number;
  // Opacity 0-100
  opacity?: number;
}

/**
 * Apply a logo overlay onto a base image.
 * Both inputs are Buffer (raw image bytes).
 * Returns the composited image as Buffer (PNG).
 */
export async function applyLogoOverlay(
  baseImageBuffer: Buffer,
  logoBuffer: Buffer,
  options: LogoOverlayOptions = {}
): Promise<Buffer> {
  const position = options.position || "bottom-right";
  const sizePercent = Math.max(5, Math.min(30, options.sizePercent ?? 12));
  const paddingPercent = Math.max(1, Math.min(10, options.paddingPercent ?? 3));
  const opacity = Math.max(20, Math.min(100, options.opacity ?? 100));

  // Get base image dimensions
  const baseImage = sharp(baseImageBuffer);
  const baseMeta = await baseImage.metadata();
  if (!baseMeta.width || !baseMeta.height) {
    throw new Error("Base-Bild hat keine gültigen Dimensionen");
  }

  // Compute target logo width and padding
  const targetLogoWidth = Math.round((baseMeta.width * sizePercent) / 100);
  const padding = Math.round((baseMeta.width * paddingPercent) / 100);

  // Resize logo to target width (preserves aspect ratio)
  let logo = sharp(logoBuffer).resize({ width: targetLogoWidth, withoutEnlargement: false });

  // Apply opacity if less than 100
  if (opacity < 100) {
    logo = logo.composite([
      {
        input: Buffer.from([255, 255, 255, Math.round((opacity / 100) * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ]);
  }

  const logoBuffer2 = await logo.png().toBuffer();
  const logoMeta = await sharp(logoBuffer2).metadata();

  if (!logoMeta.width || !logoMeta.height) {
    throw new Error("Logo hat keine gültigen Dimensionen");
  }

  // Compute position offsets
  let left = padding;
  let top = padding;

  if (position === "top-right" || position === "bottom-right") {
    left = baseMeta.width - logoMeta.width - padding;
  }
  if (position === "bottom-left" || position === "bottom-right") {
    top = baseMeta.height - logoMeta.height - padding;
  }

  // Ensure within bounds
  left = Math.max(0, Math.min(left, baseMeta.width - logoMeta.width));
  top = Math.max(0, Math.min(top, baseMeta.height - logoMeta.height));

  // Composite
  const result = await sharp(baseImageBuffer)
    .composite([
      {
        input: logoBuffer2,
        top,
        left,
      },
    ])
    .png()
    .toBuffer();

  return result;
}
