import episode01 from './episode01.js';
import { otherEpisodes } from './otherEpisodes.js';

// Canonical QUEST episode arc; detailed stop coordinates live in each episode's map data.
export const episodeJourney = [
  { id: 1, title: 'THE WEST: EUROPE', route: ['London', 'Istanbul'] },
  { id: 2, title: 'THE ROAD TO THE EAST', route: ['Istanbul', 'Central Asia', 'China'] },
  { id: 3, title: 'ACROSS THE PACIFIC', route: ['China', 'Japan', 'Philippines', 'California'] },
  { id: 4, title: 'THE AMERICAN CROSSING', route: ['California', 'Texas', 'Mexico', 'Central America', 'Brazil'] },
  { id: 5, title: 'THE SANDS OF AFRICA', route: ['Brazil', 'West Africa', 'Morocco', 'Spain', 'Portugal', 'England'] }
];

export const episodes = [episode01, ...otherEpisodes];
export { episode01 };
