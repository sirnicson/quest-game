import episode01 from './episode01.js';
import { otherEpisodes } from './otherEpisodes.js';

// Canonical QUEST episode arc; detailed stop coordinates live in each episode's map data.
export const episodeJourney = [
  { id: 1, title: 'The West: Europe', route: ['London', 'Istanbul'] },
  { id: 2, title: 'The East: Asia', route: ['Istanbul', 'Central Asia', 'China'] },
  { id: 3, title: 'The Pacific: Islands', route: ['China', 'Japan', 'Philippines', 'California'] },
  { id: 4, title: 'The New World: America', route: ['California', 'Texas', 'Mexico', 'Central America', 'Brazil'] },
  { id: 5, title: 'The Old World: Africa', route: ['Brazil', 'West Africa', 'Morocco', 'Spain', 'Portugal', 'England'] }
];

export const episodes = [episode01, ...otherEpisodes];
export { episode01 };
