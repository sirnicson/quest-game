// x/y are pixel positions on assets/episodes/episode01/europe locations.png (1602x982).
const episode01 = {
  id: 1,
  title: 'THE WEST: EUROPE',
  start: { name: 'London, England', x: 371.4, y: 334.7 },
  bounds: { west: -10, east: 33, south: 34, north: 61 },
  stops: [
    { name: 'Manchester, England', x: 308, y: 255 },
    { name: 'Glasgow, Scotland', x: 246, y: 165 },
    { name: 'Ebeltoft, Denmark', x: 785, y: 159, travel: 'NORTH SEA CROSSING' },
    { name: 'Hamburg, Germany', x: 759, y: 261 },
    { name: 'Strasbourg, France', x: 671, y: 433 },
    { name: 'Forêt de la Robertsau, France', x: 686, y: 461 },
    { name: 'Interlaken, Switzerland', x: 666, y: 521 },
    { name: 'Chamonix, France', x: 628, y: 559 },
    { name: 'Dolomites, Italy', x: 818, y: 519 },
    { name: 'Venice, Italy', x: 831, y: 571 },
    { name: 'Meteora, Greece', x: 1180, y: 799 },
    { name: 'Athens, Greece', x: 1254, y: 874 },
    { name: 'Edirne, Turkey', x: 1372, y: 724 },
    { name: 'Istanbul, Turkey', x: 1474, y: 747 }
  ]
};

export const stops = episode01.stops;
// Index 0 is London (START); index 14 is Istanbul. Position 15 means a player has finished.
export const journey = [episode01.start, ...episode01.stops];
export const FINAL_POSITION = journey.length;
export default episode01;
