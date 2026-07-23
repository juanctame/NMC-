/**
 * Reviews — the public, Letterboxd-style voice on each place. Every review
 * written in the app is public; per place they sort by popularity (likes) and
 * can be filtered to just the people you follow. Seed reviews come from the
 * friends graph, the wider community, and verified critics.
 */

export type Review = {
  id: string;
  placeId: string;
  authorId: string;
  author: string;
  initials: string;
  color: string;
  score: number; // the author's own 0–10 rating
  text: string;
  date: string; // relative, e.g. "2w"
  baseLikes: number;
  friend: boolean; // author is in the user's friends graph
  critic?: boolean; // verified critic voice
};

export const REVIEWS: Review[] = [
  // El Vilsito
  { id: 'rv-vil-1', placeId: 'vilsito', authorId: 'rm', author: 'Rosa Méndez', initials: 'RM', color: 'var(--sun-500)', score: 9.4, text: 'The suadero at 1am is a religious experience. I measure every other taco in this city against it.', date: '2w', baseLikes: 42, friend: true },
  { id: 'rv-vil-2', placeId: 'vilsito', authorId: 'df', author: 'Diego Fuentes', initials: 'DF', color: 'var(--stamp-blue)', score: 8.7, text: 'A body-shop by day, the best trompo in the city by night. Get the campechano and thank me later.', date: '1mo', baseLikes: 28, friend: true },
  { id: 'rv-vil-3', placeId: 'vilsito', authorId: 'luis', author: 'Luis T.', initials: 'LT', color: 'var(--stamp-green)', score: 9.0, text: 'Worth the Narvarte trek. Cash only, no seats, come hungry. Peak CDMX.', date: '3w', baseLikes: 15, friend: false },

  // Contramar
  { id: 'rv-con-1', placeId: 'contramar', authorId: 'sr', author: 'Sofía Reyes', initials: 'SR', color: 'var(--stamp-pink)', score: 9.0, text: 'The tuna tostada earns every bit of the hype. Long lunches only — clear your whole afternoon.', date: '1w', baseLikes: 51, friend: true },
  { id: 'rv-con-2', placeId: 'contramar', authorId: 'maria', author: 'Chef Maria', initials: 'CM', color: 'var(--ink-400)', score: 9.2, text: 'The dish that launched a thousand imitators, and still the one they are all chasing.', date: '1mo', baseLikes: 88, friend: false, critic: true },
  { id: 'rv-con-3', placeId: 'contramar', authorId: 'ml', author: 'Mariana López', initials: 'ML', color: 'var(--stamp-green)', score: 8.5, text: 'Pescado a la talla for the table, always. Touristy now, but it still sings.', date: '2mo', baseLikes: 33, friend: true },

  // Panadería Rosetta
  { id: 'rv-ros-1', placeId: 'rosetta', authorId: 'df', author: 'Diego Fuentes', initials: 'DF', color: 'var(--stamp-blue)', score: 9.2, text: 'Guava-and-cream rolls before the window empties. The townhouse setting is half the joy.', date: '3w', baseLikes: 39, friend: true },
  { id: 'rv-ros-2', placeId: 'rosetta', authorId: 'rm', author: 'Rosa Méndez', initials: 'RM', color: 'var(--sun-500)', score: 8.9, text: 'Best pan in the city, no debate. The rol de guayaba is the move, every time.', date: '1mo', baseLikes: 44, friend: true },

  // Taquería Orinoco
  { id: 'rv-ori-1', placeId: 'orinoco', authorId: 'rm', author: 'Rosa Méndez', initials: 'RM', color: 'var(--sun-500)', score: 9.2, text: 'Northern-style, late into the night, and that famous chicharrón is the whole point.', date: '2w', baseLikes: 30, friend: true },
  { id: 'rv-ori-2', placeId: 'orinoco', authorId: 'av', author: 'Andrés Vega', initials: 'AV', color: 'var(--ink-400)', score: 8.9, text: 'My post-mezcal ritual. Order the costra and do not overthink it.', date: '1mo', baseLikes: 22, friend: true },
  { id: 'rv-ori-3', placeId: 'orinoco', authorId: 'priya', author: 'Priya S.', initials: 'PS', color: 'var(--stamp-pink)', score: 9.1, text: 'Open till 3am and always, always worth it.', date: '5d', baseLikes: 12, friend: false },

  // Mercado de Medellín
  { id: 'rv-med-1', placeId: 'medellin', authorId: 'ml', author: 'Mariana López', initials: 'ML', color: 'var(--stamp-green)', score: 8.6, text: 'The tlacoyo lady deserves a star. Blue corn, requesón, second aisle past the flowers.', date: '1w', baseLikes: 26, friend: true },

  // Pujol
  { id: 'rv-puj-1', placeId: 'pujol', authorId: 'rm', author: 'Rosa Méndez', initials: 'RM', color: 'var(--sun-500)', score: 9.6, text: 'The mole madre, aged for years and counting, is worth every peso and the reservation grind.', date: '2mo', baseLikes: 61, friend: true },
  { id: 'rv-puj-2', placeId: 'pujol', authorId: 'sr', author: 'Sofía Reyes', initials: 'SR', color: 'var(--stamp-pink)', score: 9.3, text: 'A special-occasion pilgrimage. Book weeks out, then forget the bill.', date: '3mo', baseLikes: 40, friend: true },

  // El Turix
  { id: 'rv-tur-1', placeId: 'turix', authorId: 'df', author: 'Diego Fuentes', initials: 'DF', color: 'var(--stamp-blue)', score: 9.0, text: 'Cochinita from a hole in the wall until the pib runs out. Go early or go home.', date: '1mo', baseLikes: 19, friend: true },

  // Churrería El Moro
  { id: 'rv-mor-1', placeId: 'moro', authorId: 'priya', author: 'Priya S.', initials: 'PS', color: 'var(--stamp-pink)', score: 7.5, text: 'Churros at 4am hit different. The chocolate is thick as paint, in the best way.', date: '2w', baseLikes: 17, friend: false },

  // La Ópera
  { id: 'rv-ope-1', placeId: 'opera', authorId: 'luis', author: 'Luis T.', initials: 'LT', color: 'var(--stamp-green)', score: 7.8, text: 'Come for the ceiling bullet hole, stay for the vermouth and the botanas.', date: '1mo', baseLikes: 9, friend: false },
];
