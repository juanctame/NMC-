/**
 * Food scan (native shim). The web build classifies photos on-device with
 * TensorFlow.js (foodScan.web.ts); a native build would use a bundled
 * TFLite / Core ML model behind the same signatures. Without it, photo sync
 * works on location alone.
 */
export type FoodScore = { food: number; label?: string };
export const FOOD_THRESHOLD = 0.3;
export function foodScanSupported(): boolean {
  return false;
}
export function scoreProbs(_probs: ArrayLike<number>): FoodScore {
  return { food: 0 };
}
export async function scanFood(urls: string[], _onProgress?: (done: number, total: number) => void): Promise<(FoodScore | null)[]> {
  return urls.map(() => null);
}
