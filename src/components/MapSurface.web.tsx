/**
 * MapSurface (web) — a live Google Map (Maps JavaScript API + Advanced Markers).
 * Each grade / event / table pin becomes a branded sticker marker at its real
 * lat/lon, tapping one selects it (same detail card as native). The base tiles
 * come from Google so streets and neighbourhoods are the real ones. If the key
 * or network is unavailable it degrades to a paper background with a note.
 *
 * The API key is a browser key locked to referrers — see src/config.ts.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { City } from '../data/cities';
import type { Pin } from '../data/geo';
import { C, col } from '../theme/tokens';
import { GOOGLE_MAPS_MAP_ID } from '../config';
import { loadGoogleMaps } from '../data/googleMaps';

type Props = {
  pins: Pin[];
  city: City;
  selPin: { kind: string; id: string } | null;
  onSelect: (p: { kind: string; id: string }) => void;
};

const loadMaps = loadGoogleMaps;

/** A sticker roundel matching the native pin, as a DOM node for the marker. */
function markerEl(pin: Pin, selected: boolean): HTMLElement {
  const size = selected ? 40 : pin.kind === 'grade' && pin.dashed ? 34 : 32;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'transform: translateY(-4px) rotate(-4deg); cursor: pointer;';
  const el = document.createElement('div');
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    `background:${col(pin.bg)}`,
    `border:2.5px solid ${col(C.inkBlack)}`,
    `box-shadow:2px 2px 0 ${col(C.inkBlack)}`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    "font-family:'Space Grotesk',system-ui,sans-serif",
    'font-weight:800',
    `font-size:${selected ? 13 : 11}px`,
    `color:${col(pin.fg)}`,
    pin.dashed ? `outline:2px dashed ${col(pin.fg)};outline-offset:-6px` : '',
  ].join(';');
  el.textContent = pin.metric;
  wrap.appendChild(el);
  return wrap;
}

function youEl(label: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none;';
  const ring = document.createElement('div');
  ring.style.cssText = `width:42px;height:42px;border-radius:50%;background:rgba(216,80,26,0.18);display:flex;align-items:center;justify-content:center;`;
  const dot = document.createElement('div');
  dot.style.cssText = `width:16px;height:16px;border-radius:50%;background:${col(C.ink400)};border:2.5px solid ${col(C.paper0)};`;
  ring.appendChild(dot);
  const tag = document.createElement('div');
  tag.textContent = label;
  tag.style.cssText = `margin-top:2px;background:${col(C.paper0)};border:1.5px solid ${col(C.inkBlack)};border-radius:999px;padding:1px 7px;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:${col(C.ink400)};`;
  wrap.appendChild(ring);
  wrap.appendChild(tag);
  return wrap;
}

export function MapSurface({ pins, city, selPin, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  // scaffold + load once
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = 'position:absolute;inset:0;';
    const status = document.createElement('div');
    status.textContent = 'Loading map…';
    status.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a795e;";
    host.appendChild(mapDiv);
    host.appendChild(status);
    mapDivRef.current = mapDiv;
    statusRef.current = status;

    let cancelled = false;
    loadMaps()
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        mapRef.current = new maps.Map(mapDivRef.current, {
          center: { lat: city.center.lat, lng: city.center.lon },
          zoom: 14,
          mapId: GOOGLE_MAPS_MAP_ID,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          backgroundColor: '#efe7d3',
        });
        statusRef.current?.remove();
        setReady(true);
      })
      .catch(() => {
        if (statusRef.current) statusRef.current.textContent = 'Map unavailable — check the key’s website restriction';
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recenter when the city changes
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo({ lat: city.center.lat, lng: city.center.lon });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id]);

  // (re)draw markers whenever the map is ready or the pins/selection change
  useEffect(() => {
    const maps = (window as any).google?.maps;
    const map = mapRef.current;
    if (!ready || !maps || !map) return;
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    pins.slice(0, 140).forEach((pin) => {
      const selected = !!selPin && selPin.kind === pin.kind && selPin.id === pin.id;
      const marker = new maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: pin.coord.lat, lng: pin.coord.lon },
        content: markerEl(pin, selected),
        zIndex: selected ? 999 : pin.kind === 'event' ? 3 : pin.kind === 'table' ? 2 : 1,
        title: pin.id,
      });
      marker.addListener('click', () => onSelect({ kind: pin.kind, id: pin.id }));
      markersRef.current.push(marker);
    });
    const you = new maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: city.center.lat, lng: city.center.lon },
      content: youEl(city.name),
      zIndex: 0,
    });
    markersRef.current.push(you);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pins, selPin, city.id]);

  return React.createElement('div', {
    ref: hostRef,
    style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#efe7d3', overflow: 'hidden' },
  });
}
