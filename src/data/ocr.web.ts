/**
 * Read screenshots of your lists (Beli, Google Maps, Instagram saves, any app)
 * right in the browser — nothing is uploaded. Text recognition is Tesseract,
 * loaded on first use from a CDN (~4 MB, English + Spanish).
 *
 * Two passes per screenshot: the whole image for names and colonias, then the
 * right-hand strip — where apps like Beli put the score in a ring — cropped,
 * cleaned (the ring erased) and read again, each score joined to its row.
 */
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

export function ocrSupported(): boolean {
  return typeof document !== 'undefined';
}

export function pickImages(): Promise<File[]> {
  return pickFiles('image/*', true);
}

/** Open the file picker; resolves with the chosen files (empty if cancelled). */
export function pickFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    let done = false;
    const finish = (files: File[]) => {
      if (done) return;
      done = true;
      try {
        input.remove();
      } catch {
        /* ignore */
      }
      resolve(files);
    };
    input.onchange = () => finish(input.files ? Array.from(input.files) : []);
    window.addEventListener('focus', () => setTimeout(() => finish([]), 1200), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

let tessP: Promise<any> | null = null;
function loadTesseract(): Promise<any> {
  if ((window as any).Tesseract) return Promise.resolve((window as any).Tesseract);
  if (!tessP) {
    tessP = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESS;
      s.async = true;
      s.onload = () => resolve((window as any).Tesseract);
      s.onerror = () => {
        tessP = null;
        reject(new Error('Could not load the text reader — check your connection.'));
      };
      document.head.appendChild(s);
    });
  }
  return tessP;
}

let workerP: Promise<any> | null = null;
async function worker(onStatus?: (s: string) => void): Promise<any> {
  if (!workerP) {
    workerP = (async () => {
      const T = await loadTesseract();
      onStatus?.('Getting the text reader ready…');
      return T.createWorker(['eng', 'spa'], 1, {});
    })().catch((e) => {
      workerP = null;
      throw e;
    });
  }
  return workerP;
}

async function toImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/** The right-hand strip, upscaled ×2, black-and-white, rings erased (scores in circles). */
function scoreStrip(img: HTMLImageElement): { canvas: HTMLCanvasElement; x0: number } {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const x0 = Math.round(W * 0.8);
  const c = document.createElement('canvas');
  c.width = (W - x0) * 2;
  c.height = H * 2;
  const g = c.getContext('2d')!;
  g.drawImage(img, x0, 0, W - x0, H, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const a = d.data;
  // dark text on light, or light text on dark: threshold on distance from the background
  let bg = 0;
  for (let i = 0; i < a.length; i += 4 * 97) bg += 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2];
  bg /= Math.ceil(a.length / (4 * 97));
  const dark = bg > 128;
  for (let i = 0; i < a.length; i += 4) {
    const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2];
    const ink = dark ? l < bg - 55 : l > bg + 55;
    a[i] = a[i + 1] = a[i + 2] = ink ? 0 : 255;
  }
  // erase rings: dark blobs much bigger than a character in both directions, mostly hollow
  const w = c.width;
  const h = c.height;
  const seen = new Uint8Array(w * h);
  const comps: { x0: number; y0: number; x1: number; y1: number; px: number[] }[] = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || a[i * 4] !== 0) continue;
    const st = [i];
    seen[i] = 1;
    let bx0 = w, by0 = h, bx1 = 0, by1 = 0;
    const px: number[] = [];
    while (st.length) {
      const k = st.pop()!;
      px.push(k);
      const x = k % w;
      const y = (k / w) | 0;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
      for (const n of [k - 1, k + 1, k - w, k + w]) {
        if (n >= 0 && n < w * h && !seen[n] && a[n * 4] === 0 && Math.abs((n % w) - x) <= 1) {
          seen[n] = 1;
          st.push(n);
        }
      }
    }
    comps.push({ x0: bx0, y0: by0, x1: bx1, y1: by1, px });
  }
  const hs = comps.map((cp) => cp.y1 - cp.y0 + 1).sort((p, q) => p - q);
  const med = hs[Math.floor(hs.length / 2)] || 10;
  for (const cp of comps) {
    const cw = cp.x1 - cp.x0 + 1;
    const ch = cp.y1 - cp.y0 + 1;
    if (cw > 2.2 * med && ch > 2.2 * med && cp.px.length < 0.35 * cw * ch) for (const k of cp.px) a[k * 4] = a[k * 4 + 1] = a[k * 4 + 2] = 255;
  }
  g.putImageData(d, 0, 0);
  return { canvas: c, x0 };
}

type Line = { text: string; y0: number; y1: number; x1: number };

function linesOf(data: any): Line[] {
  const out: Line[] = [];
  for (const b of data?.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) out.push({ text: String(l.text || '').trim(), y0: l.bbox.y0, y1: l.bbox.y1, x1: l.bbox.x1 });
  return out.filter((l) => l.text);
}

const SCORE = /^(10(?:[.,]0)?|\d[.,]\d|\d{2})$/;

/** Read one screenshot: its lines of text, with right-edge scores joined to their rows. */
async function readOne(w: any, file: File): Promise<string> {
  const img = await toImage(file);
  const portrait = img.naturalHeight > img.naturalWidth * 1.3;
  await w.setParameters({ tessedit_pageseg_mode: '3' });
  // a phone screenshot: read the text column without the score badges (they only add noise)
  let src: HTMLImageElement | HTMLCanvasElement = img;
  if (portrait) {
    const left = document.createElement('canvas');
    left.width = Math.round(img.naturalWidth * 0.8);
    left.height = img.naturalHeight;
    left.getContext('2d')!.drawImage(img, 0, 0);
    src = left;
  }
  const full = await w.recognize(src, {}, { blocks: true, text: true });
  const lines = linesOf(full.data);
  if (portrait) {
    const { canvas, x0 } = scoreStrip(img);
    await w.setParameters({ tessedit_pageseg_mode: '11' });
    const strip = await w.recognize(canvas, {}, { blocks: true });
    for (const b of strip.data?.blocks || [])
      for (const p of b.paragraphs || [])
        for (const l of p.lines || [])
          for (const wd of l.words || []) {
            const t = String(wd.text || '').trim();
            if (!SCORE.test(t)) continue;
            const yc = (wd.bbox.y0 + wd.bbox.y1) / 4; // back to the screenshot's scale
            // the row it sits in: the nearest line of text left of the strip
            let best: Line | null = null;
            let bd = Infinity;
            for (const ln of lines) {
              if (ln.x1 > x0 + 8 && !SCORE.test(ln.text.split(' ').pop() || '')) continue;
              const d = yc < ln.y0 ? ln.y0 - yc : yc > ln.y1 ? yc - ln.y1 : 0;
              if (d < bd) {
                bd = d;
                best = ln;
              }
            }
            if (best && bd < (best.y1 - best.y0) * 2.5) best.text = best.text.replace(/\s+(10(?:[.,]0)?|\d[.,]\d|\d{2})$/, '') + ' ' + t;
          }
  }
  return lines.map((l) => l.text).join('\n');
}

/** Read screenshots in order; reports progress ("Reading 2 of 5…"). */
export async function ocrScreens(files: File[], onStatus?: (s: string) => void): Promise<string> {
  onStatus?.('Loading the text reader…');
  const w = await worker(onStatus);
  const out: string[] = [];
  for (const [i, f] of files.entries()) {
    onStatus?.(`Reading screenshot ${i + 1} of ${files.length}…`);
    try {
      out.push(await readOne(w, f));
    } catch {
      // an unreadable image: skip it
    }
  }
  return out.join('\n');
}

/** A text file's contents (CSV, JSON, KML, TXT). */
export function readText(file: File): Promise<string> {
  return file.text();
}
