/**
 * Screenshot reading + file picking (native shim). The web build reads images
 * with in-browser OCR (ocr.web.ts); a native build would use expo-image-picker /
 * expo-document-picker plus on-device text recognition behind the same
 * signatures. Until then, native imports use pasted text.
 */
export function ocrSupported(): boolean {
  return false;
}
export async function pickImages(): Promise<any[]> {
  return [];
}
export async function pickFiles(_accept: string, _multiple: boolean): Promise<any[]> {
  return [];
}
export async function ocrScreens(_files: any[], _onStatus?: (s: string) => void): Promise<string> {
  return '';
}
export async function readText(_file: any): Promise<string> {
  return '';
}
