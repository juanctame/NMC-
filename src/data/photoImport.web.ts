/**
 * Photo import (web) — lets a new user build their passport from the food photos
 * already on their device. We open the system photo/file picker, read each
 * image's **EXIF GPS tag in the browser** (nothing is uploaded), and hand back
 * the coordinates; the store then asks the places provider which restaurant sits
 * at each point. HEIC/screenshots/stripped photos simply yield no GPS and are
 * skipped. Privacy: only the location tag is read on-device — the photos
 * themselves never leave the browser.
 */
import type { PhotoPoint } from './photoImportTypes';

const MAX_FILES = 40; // keep the scan snappy
const HEAD_BYTES = 131072; // EXIF APP1 is capped at 64 KB and sits at the file start

export function photoImportSupported(): boolean {
  return typeof document !== 'undefined';
}

/** Open the OS photo picker and resolve with the chosen files (empty if canceled). */
function openFilePicker(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
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
    // If the user cancels there's no reliable event; resolve empty on window refocus.
    const onFocus = () => setTimeout(() => finish([]), 800);
    window.addEventListener('focus', onFocus, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

function rational(view: DataView, o: number, le: boolean): number {
  const n = view.getUint32(o, le);
  const d = view.getUint32(o + 4, le);
  return d ? n / d : 0;
}

/** Three RATIONALs (deg, min, sec) → decimal degrees. */
function dms(view: DataView, o: number, le: boolean): number {
  return rational(view, o, le) + rational(view, o + 8, le) / 60 + rational(view, o + 16, le) / 3600;
}

/** Parse EXIF from a JPEG header buffer → {lat,lon,time} or null if none/not JPEG. */
function parseExifGps(ab: ArrayBuffer): { lat: number; lon: number; time?: number } | null {
  const view = new DataView(ab);
  const len = view.byteLength;
  if (len < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

  // Walk JPEG markers to find APP1 "Exif".
  let off = 2;
  let tiff = -1;
  while (off + 4 <= len) {
    if (view.getUint8(off) !== 0xff) {
      off++;
      continue;
    }
    const marker = view.getUint8(off + 1);
    if (marker === 0xd8 || marker === 0xd9) {
      off += 2;
      continue;
    }
    if (marker === 0xda) break; // start of scan — no more metadata
    const size = view.getUint16(off + 2);
    if (marker === 0xe1 && off + 10 <= len && view.getUint32(off + 4) === 0x45786966 && view.getUint16(off + 8) === 0x0000) {
      tiff = off + 10; // after "Exif\0\0"
      break;
    }
    off += 2 + size;
  }
  if (tiff < 0 || tiff + 8 > len) return null;

  const le = view.getUint16(tiff) === 0x4949; // 'II' little-endian, 'MM' big
  const u16 = (o: number) => view.getUint16(o, le);
  const u32 = (o: number) => view.getUint32(o, le);

  const ifd0 = tiff + u32(tiff + 4);
  if (ifd0 + 2 > len) return null;
  let gpsOff = 0;
  let exifOff = 0;
  const n0 = u16(ifd0);
  for (let i = 0; i < n0; i++) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > len) break;
    const tag = u16(e);
    if (tag === 0x8825) gpsOff = tiff + u32(e + 8);
    else if (tag === 0x8769) exifOff = tiff + u32(e + 8);
  }
  if (!gpsOff || gpsOff + 2 > len) return null;

  let latRef = '';
  let lonRef = '';
  let lat: number | null = null;
  let lon: number | null = null;
  const ng = u16(gpsOff);
  for (let i = 0; i < ng; i++) {
    const e = gpsOff + 2 + i * 12;
    if (e + 12 > len) break;
    const tag = u16(e);
    if (tag === 0x0001) latRef = String.fromCharCode(view.getUint8(e + 8));
    else if (tag === 0x0003) lonRef = String.fromCharCode(view.getUint8(e + 8));
    else if (tag === 0x0002) {
      const o = tiff + u32(e + 8);
      if (o + 24 <= len) lat = dms(view, o, le);
    } else if (tag === 0x0004) {
      const o = tiff + u32(e + 8);
      if (o + 24 <= len) lon = dms(view, o, le);
    }
  }
  if (lat == null || lon == null || (lat === 0 && lon === 0)) return null;
  const latD = lat * (latRef === 'S' ? -1 : 1);
  const lonD = lon * (lonRef === 'W' ? -1 : 1);

  // Optional capture time (DateTimeOriginal "YYYY:MM:DD HH:MM:SS").
  let time: number | undefined;
  if (exifOff && exifOff + 2 <= len) {
    const ne = u16(exifOff);
    for (let i = 0; i < ne; i++) {
      const e = exifOff + 2 + i * 12;
      if (e + 12 > len) break;
      if (u16(e) === 0x9003) {
        const o = tiff + u32(e + 8);
        if (o + 19 <= len) {
          let str = '';
          for (let k = 0; k < 19; k++) str += String.fromCharCode(view.getUint8(o + k));
          const m = str.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (m) time = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
        }
        break;
      }
    }
  }
  return { lat: latD, lon: lonD, time };
}

/**
 * Open the picker and return the geotagged photos among the selection, plus how
 * many were scanned (so the UI can explain "0 of 12 had location tags").
 */
export async function pickFoodPhotos(): Promise<{ points: PhotoPoint[]; scanned: number }> {
  const files = (await openFilePicker()).filter((f) => /image\//i.test(f.type) || /\.(jpe?g)$/i.test(f.name));
  const take = files.slice(0, MAX_FILES);
  const points: PhotoPoint[] = [];
  for (const f of take) {
    try {
      const head = await f.slice(0, HEAD_BYTES).arrayBuffer();
      const gps = parseExifGps(head);
      if (gps) points.push({ lat: gps.lat, lon: gps.lon, time: gps.time, preview: URL.createObjectURL(f) });
    } catch {
      /* skip unreadable file */
    }
  }
  return { points, scanned: take.length };
}
