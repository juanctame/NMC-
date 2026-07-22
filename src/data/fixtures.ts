/**
 * A small, realistic Overpass response for CDMX — real spots with approximate
 * coordinates inside the CDMX dining bbox. Used to (a) unit-test / preview the
 * normalization + map pipeline offline, and (b) act as a last-resort fallback
 * for CDMX if every Overpass endpoint is unreachable at runtime.
 */
import type { OsmElement } from './osm';

export const CDMX_FIXTURE: OsmElement[] = [
  { type: 'node', id: 1001, lat: 19.4122, lon: -99.1701, tags: { name: 'Tacos Hola El Güero', amenity: 'fast_food', cuisine: 'mexican;tacos', 'addr:street': 'Amsterdam 135', 'addr:neighbourhood': 'Condesa', opening_hours: 'Mo-Sa 13:00-18:00' } },
  { type: 'node', id: 1002, lat: 19.4188, lon: -99.1612, tags: { name: 'Panadería Rosetta', amenity: 'cafe', cuisine: 'bakery;coffee_shop', 'addr:street': 'Colima 179', 'addr:neighbourhood': 'Roma Norte', opening_hours: 'Mo-Su 07:00-21:00' } },
  { type: 'node', id: 1003, lat: 19.4171, lon: -99.1653, tags: { name: 'Contramar', amenity: 'restaurant', cuisine: 'seafood', 'addr:street': 'Durango 200', 'addr:neighbourhood': 'Roma Norte', opening_hours: 'Mo-Su 12:00-18:30' } },
  { type: 'node', id: 1004, lat: 19.4315, lon: -99.1403, tags: { name: 'Churrería El Moro', amenity: 'cafe', cuisine: 'churro;dessert', 'addr:street': 'Eje Central 42', 'addr:neighbourhood': 'Centro', opening_hours: '24/7' } },
  { type: 'node', id: 1005, lat: 19.4205, lon: -99.1691, tags: { name: 'Taquería Orinoco', amenity: 'fast_food', cuisine: 'tacos', 'addr:street': 'Álvaro Obregón 179', 'addr:neighbourhood': 'Roma Norte', opening_hours: 'Mo-Su 18:00-03:00' } },
  { type: 'node', id: 1006, lat: 19.4212, lon: -99.1583, tags: { name: 'Máximo Bistrot', amenity: 'restaurant', cuisine: 'contemporary', 'addr:street': 'Anatole France 40', 'addr:neighbourhood': 'Polanco', opening_hours: 'Tu-Su 13:00-22:00' } },
  { type: 'node', id: 1007, lat: 19.4133, lon: -99.1782, tags: { name: 'Lardo', amenity: 'restaurant', cuisine: 'mediterranean', 'addr:street': 'Agustín Melgar 6', 'addr:neighbourhood': 'Condesa', opening_hours: 'Mo-Su 09:00-23:00' } },
  { type: 'way', id: 1008, center: { lat: 19.4162, lon: -99.1627 }, tags: { name: 'Mercado Roma', amenity: 'food_court', cuisine: 'regional', 'addr:street': 'Querétaro 225', 'addr:neighbourhood': 'Roma Norte', opening_hours: 'Mo-Su 09:00-22:00' } },
  { type: 'node', id: 1009, lat: 19.4271, lon: -99.1571, tags: { name: 'Café Nin', amenity: 'cafe', cuisine: 'coffee_shop;breakfast', 'addr:street': 'Havre 73', 'addr:neighbourhood': 'Juárez', opening_hours: 'Mo-Su 07:30-22:00' } },
  { type: 'node', id: 1010, lat: 19.4098, lon: -99.1668, tags: { name: 'El Tizoncito', amenity: 'fast_food', cuisine: 'tacos;al_pastor', 'addr:street': 'Tamaulipas 122', 'addr:neighbourhood': 'Condesa', opening_hours: 'Mo-Su 11:00-02:00' } },
  { type: 'node', id: 1011, lat: 19.4231, lon: -99.1552, tags: { name: 'Por Siempre Vegana Taquería', amenity: 'fast_food', cuisine: 'vegan;tacos', 'addr:street': 'Manzanillo 62', 'addr:neighbourhood': 'Roma Sur', opening_hours: 'Tu-Su 13:00-23:00' } },
  { type: 'node', id: 1012, lat: 19.4256, lon: -99.1338, tags: { name: 'El Cardenal', amenity: 'restaurant', cuisine: 'mexican', 'addr:street': 'Palma 23', 'addr:neighbourhood': 'Centro', opening_hours: 'Mo-Su 08:00-18:30' } },
];
