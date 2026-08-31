/**
 * The contract every template signs.
 *
 * A template is a pure function of what it is given: it reads no globals, it
 * owns no state, and it reports what it did so the Studio can show honest
 * numbers rather than claims.
 */

import type { Format, Theme } from "../tokens";
import type { Focal } from "../photo";
import type { PartCtx } from "./parts";

export type TemplateArgs = {
  ctx: CanvasRenderingContext2D;
  fmt: Format;
  theme: Theme;
  accent: string;
  /**
   * Every selected photo, best first. Most templates use only `[0]`; Gallery
   * uses up to three and degrades gracefully when it has fewer.
   */
  photos: HTMLImageElement[];
  focal: Focal;
  parts: Omit<PartCtx, "s">;
};

export type TemplateReport = {
  /** Where the photo block ends, as a fraction of canvas height. */
  photoBand: number;
  /** Plateau opacity actually used, when the template scrims a photo. */
  scrimPeak: number | null;
  /** Mean relative luminance measured under the type, when one was sampled. */
  photoLuminance: number | null;
};

export const noPhotoReport = (photoBand: number): TemplateReport => ({
  photoBand, scrimPeak: null, photoLuminance: null,
});
