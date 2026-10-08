/**
 * Photo import (native shim). Reading the camera roll + EXIF on iOS/Android needs
 * expo-media-library / expo-image-picker, which aren't bundled in this build, so
 * the feature is web-only for now. A real native build would swap this for
 * `MediaLibrary.getAssetsAsync` + `getAssetInfoAsync` (which exposes `location`)
 * behind the same signature.
 */
import type { PhotoPoint } from './photoImportTypes';

export function photoImportSupported(): boolean {
  return false;
}

export async function pickFoodPhotos(): Promise<{ points: PhotoPoint[]; scanned: number }> {
  return { points: [], scanned: 0 };
}
