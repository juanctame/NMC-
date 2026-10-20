/**
 * Food scan — is this photo food (or a meal out)? Runs on this device with
 * TensorFlow.js and MobileNet v2 (ImageNet), both loaded on first use (~14 MB,
 * cached by the browser afterwards). Nothing is uploaded.
 *
 * The score adds up the model's confidence across dishes (tacos-adjacent:
 * burrito, guacamole, hot pot, pizza, carbonara, ice cream, espresso…),
 * seafood, produce and the scene of a meal (plate, bowl, dining table, menu,
 * glasses, restaurant, bakery), each weighted by how much it says "I ate here".
 */
const TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const MODEL = 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json';

/** ImageNet class (0-based) → how much it suggests a meal; the model's output is offset by 1 (background). */
export const FOOD_CLASSES: Record<number, { w: number; label: string }> = (() => {
  const m: Record<number, { w: number; label: string }> = {};
  const add = (ids: number[], w: number, label: string) => ids.forEach((i) => (m[i] = { w, label }));
  add([924], 1, 'guacamole');
  add([925, 926], 1, 'soup');
  add([927, 928, 929, 960], 1, 'dessert');
  add([930, 931, 932, 961], 0.9, 'bread');
  add([933, 934, 963, 965], 1, 'street food');
  add([935, 959, 962, 964], 1, 'a dish');
  add([967, 969], 0.9, 'coffee');
  add([966, 907, 441, 440, 503], 0.8, 'drinks');
  add([118, 119, 121, 122, 123, 124], 0.6, 'seafood');
  add([923, 809, 868, 532, 659], 0.7, 'a plate');
  add([922, 762], 0.7, 'a restaurant');
  add([415, 509], 0.7, 'a bakery');
  add([467, 582], 0.45, 'a market');
  add([968, 504, 849], 0.6, 'coffee');
  add([567, 909, 618, 521, 544, 469], 0.5, 'a kitchen');
  for (let i = 936; i <= 957; i++) m[i] = { w: 0.5, label: 'produce' };
  m[987] = { w: 0.5, label: 'corn' };
  return m;
})();

export const FOOD_THRESHOLD = 0.3;

export function foodScanSupported(): boolean {
  return typeof document !== 'undefined';
}

let tfP: Promise<any> | null = null;
function loadTf(): Promise<any> {
  if ((window as any).tf) return Promise.resolve((window as any).tf);
  if (!tfP) {
    tfP = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TFJS;
      s.async = true;
      s.onload = () => resolve((window as any).tf);
      s.onerror = () => {
        tfP = null;
        reject(new Error('Could not load the food scanner'));
      };
      document.head.appendChild(s);
    });
  }
  return tfP;
}

let modelP: Promise<any> | null = null;
async function model(): Promise<{ tf: any; m: any }> {
  const tf = await loadTf();
  if (!modelP) modelP = tf.loadGraphModel(MODEL).catch((e: unknown) => ((modelP = null), Promise.reject(e)));
  return { tf, m: await modelP };
}

async function square224(src: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = 224;
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  c.getContext('2d')!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 224, 224);
  return c;
}

export type FoodScore = { food: number; label?: string };

/** Score a softmax vector (1001 outputs, background first) for "meal-ness" (pure; unit-tested). */
export function scoreProbs(probs: ArrayLike<number>): FoodScore {
  let food = 0;
  let top = 0;
  let label: string | undefined;
  for (const k in FOOD_CLASSES) {
    const c = FOOD_CLASSES[+k];
    const p = (probs[+k + 1] || 0) * c.w;
    food += p;
    if (p > top) {
      top = p;
      label = c.label;
    }
  }
  return { food: Math.min(1, food), label: food >= FOOD_THRESHOLD ? label : undefined };
}

/**
 * Scan photos (object URLs) for food; null for any that can't be read. Loads the
 * model on first use; if it can't (offline), every result is null and the
 * photo sync falls back to location alone.
 */
export async function scanFood(urls: string[], onProgress?: (done: number, total: number) => void): Promise<(FoodScore | null)[]> {
  let tf: any;
  let m: any;
  try {
    ({ tf, m } = await model());
  } catch {
    return urls.map(() => null);
  }
  const out: (FoodScore | null)[] = [];
  for (const [i, u] of urls.entries()) {
    try {
      const c = await square224(u);
      const probs: Float32Array = tf.tidy(() => tf.softmax(m.predict(tf.browser.fromPixels(c).toFloat().div(255).expandDims(0))).dataSync());
      out.push(scoreProbs(probs));
    } catch {
      out.push(null);
    }
    onProgress?.(i + 1, urls.length);
    if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0)); // keep the UI breathing
  }
  return out;
}
