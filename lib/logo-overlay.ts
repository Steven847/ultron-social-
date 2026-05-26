// lib/logo-overlay.ts — Apply brand logo onto a base image using sharp
// v0.6a-buildfix3: Use Uint8Array base type to avoid Buffer<ArrayBuffer> vs Buffer<ArrayBufferLike> conflicts

import sharp from "sharp";

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Use Uint8Array as input type — Buffer extends Uint8Array, so ANY buffer variant fits
// Sharp also accepts Uint8Array natively
export interface LogoOverlayOptions {
  baseImageBuffer: Uint8Array;
  logoBuffer: Uint8Array;
  position: LogoPosition;
  sizePercent: number;
  paddingPercent: number;
  opacity: number;
}

/**
 * Composite a brand logo onto a base image. Returns a Uint8Array (which IS a Buffer).
 */
export async function applyLogoOverlay(options: LogoOverlayOptions): Promise<Uint8Array> {
  const { baseImageBuffer, logoBuffer, position, sizePercent, paddingPercent, opacity } = options;

  // --- VALIDATION ---
  if (!baseImageBuffer || baseImageBuffer.length === 0) {
    throw new Error(
      `applyLogoOverlay: baseImageBuffer is invalid (length=${baseImageBuffer?.length || 0})`
    );
  }
  if (!logoBuffer || logoBuffer.length === 0) {
    throw new Error(
      `applyLogoOverlay: logoBuffer is invalid (length=${logoBuffer?.length || 0})`
    );
  }

  console.log(
    `[logo-overlay] Start: base=${baseImageBuffer.length}B, logo=${logoBuffer.length}B, ` +
    `position=${position}, size=${sizePercent}%, padding=${paddingPercent}%, opacity=${opacity}%`
  );

  // --- READ BASE IMAGE METADATA ---
  let baseMeta;
  try {
    baseMeta = await sharp(baseImageBuffer).metadata();
  } catch (e: any) {
    throw new Error(`applyLogoOverlay: Cannot read base image metadata: ${e.message}`);
  }

  if (!baseMeta.width || !baseMeta.height) {
    throw new Error(
      `applyLogoOverlay: Base image has invalid dimensions ` +
      `(width=${baseMeta.width}, height=${baseMeta.height})`
    );
  }

  const baseWidth = baseMeta.width;
  const baseHeight = baseMeta.height;

  // --- CALCULATE LOGO SIZE AND POSITION ---
  const logoTargetWidth = Math.max(50, Math.round((sizePercent / 100) * baseWidth));
  const paddingPx = Math.max(5, Math.round((paddingPercent / 100) * baseWidth));

  // --- RESIZE LOGO + APPLY OPACITY ---
  let processedLogo: Buffer;
  try {
    let logoPipeline = sharp(logoBuffer).resize({
      width: logoTargetWidth,
      fit: "inside",
      withoutEnlargement: false,
    });

    if (opacity < 100) {
      const alphaMultiplier = opacity / 100;
      logoPipeline = logoPipeline.ensureAlpha().composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(255 * alphaMultiplier)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ]);
    }

    processedLogo = await logoPipeline.png().toBuffer();
  } catch (e: any) {
    throw new Error(`applyLogoOverlay: Logo resize/opacity failed: ${e.message}`);
  }

  const logoMeta = await sharp(processedLogo).metadata();
  const logoWidth = logoMeta.width || logoTargetWidth;
  const logoHeight = logoMeta.height || logoTargetWidth;

  // --- CALCULATE POSITION ---
  let top = 0;
  let left = 0;
  switch (position) {
    case "top-left":
      top = paddingPx;
      left = paddingPx;
      break;
    case "top-right":
      top = paddingPx;
      left = baseWidth - logoWidth - paddingPx;
      break;
    case "bottom-left":
      top = baseHeight - logoHeight - paddingPx;
      left = paddingPx;
      break;
    case "bottom-right":
      top = baseHeight - logoHeight - paddingPx;
      left = baseWidth - logoWidth - paddingPx;
      break;
  }

  top = Math.max(0, Math.min(top, baseHeight - logoHeight));
  left = Math.max(0, Math.min(left, baseWidth - logoWidth));

  console.log(
    `[logo-overlay] Compositing: base=${baseWidth}x${baseHeight}, ` +
    `logo=${logoWidth}x${logoHeight}, position=(${left},${top})`
  );

  // --- COMPOSITE ---
  let result: Buffer;
  try {
    result = await sharp(baseImageBuffer)
      .composite([
        {
          input: processedLogo,
          top,
          left,
        },
      ])
      .png()
      .toBuffer();
  } catch (e: any) {
    throw new Error(`applyLogoOverlay: Final composite failed: ${e.message}`);
  }

  console.log(`[logo-overlay] Done: result=${result.length}B`);
  return result;
}

/**
 * @deprecated Use `applyLogoOverlay` instead. This alias exists for backward compatibility.
 */
export const composeWithLogo = applyLogoOverlay;
