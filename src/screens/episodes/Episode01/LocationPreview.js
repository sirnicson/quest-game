const LOCATIONS = {
  0: {
    stop: '01',
    name: 'London, England',
    description: 'Tower Bridge opened on 30 June 1894.',
    video: 'london-tower-bridge',
    alt: 'A ferry passing under Tower Bridge in London'
  },
  1: {
    stop: '02',
    name: 'Manchester, England',
    description: 'Manchester Cathedral has over 800 years of history, dating back to 1215.',
    video: 'manchester-cathedral',
    alt: 'Aerial view of Manchester Cathedral and the city skyline'
  },
  2: {
    stop: '03',
    name: 'Glasgow, Scotland',
    description: 'Founded in 1451, the University of Glasgow is the fourth-oldest university in the English-speaking world, after Oxford, Cambridge and St Andrews.',
    video: 'glasgow-university',
    alt: 'Aerial footage of the University of Glasgow'
  },
  3: {
    stop: '04',
    name: 'Ebeltoft, Denmark',
    description: "Fregatten Jylland, built in the 19th century, is widely recognised as the world's longest surviving wooden warship.",
    video: 'ebeltoft',
    alt: 'Aerial view of Ebeltoft’s historic town and harbour'
  },
  4: {
    stop: '05',
    name: 'Hamburg, Germany',
    description: "Hamburg is Germany's second-largest city, with around 1.9 million residents.",
    video: 'hamburg-harbour',
    alt: 'Aerial view of Hamburg harbour, boats and cityscape'
  },
  5: {
    stop: '06',
    name: 'Strasbourg, France',
    description: 'Strasbourg is the official home of the European Parliament.',
    video: 'strasbourg-european-parliament',
    alt: 'Cyclist passing the European Parliament building in Strasbourg'
  },
  6: {
    stop: '07',
    name: 'Forêt de la Robertsau, France',
    description: 'Forêt de la Robertsau is a dense temperate forest in northeastern France, near Strasbourg.',
    video: 'foret-de-la-robertsau',
    alt: 'Peaceful pathway through lush forest greenery'
  },
  7: {
    stop: '08',
    name: 'Interlaken, Switzerland',
    description: 'Interlaken is a beautiful Swiss resort town located between Lake Thun and Lake Brienz, with spectacular views of the Swiss Alps. Its name literally means “between lakes.”',
    video: 'interlaken',
    alt: 'Aerial view of Interlaken and the Swiss Alps'
  },
  8: {
    stop: '09',
    name: 'Chamonix, France',
    description: 'Chamonix is home to the highest mountain in the Alps, Mont Blanc, which rises to approximately 4,806 metres.',
    video: 'chamonix-mont-blanc',
    alt: 'Aerial view of the Mont Blanc massif near Chamonix'
  },
  9: {
    stop: '10',
    name: 'Dolomites, Italy',
    description: 'The Dolomites (Dolomiti), famous for their towering limestone peaks, are a spectacular mountain range in northeastern Italy. They were named a UNESCO World Heritage Site in 2009.',
    video: 'dolomites',
    alt: 'Aerial view of the Dolomites in autumn'
  },
  10: {
    stop: '11',
    name: 'Venice, Italy',
    description: 'Venice is built on approximately 118 islands, connected by more than 400 bridges and separated by about 150 canals.',
    video: 'venice-rialto-bridge',
    alt: 'Aerial view of the Rialto Bridge and Grand Canal in Venice'
  },
  11: {
    stop: '12',
    name: 'Meteora, Greece',
    description: 'Meteora in central Greece is a UNESCO World Heritage Site famous for its monasteries built on top of towering rock pillars. Its name means “suspended in the air,” and monks once used ropes and hanging baskets to reach the top.',
    video: 'meteora',
    alt: 'Aerial view of a cliffside monastery at Meteora'
  },
  12: {
    stop: '13',
    name: 'Athens, Greece',
    description: 'Athens, the capital of Greece, is widely regarded as the birthplace of democracy and hosted the first modern Olympic Games in 1896.',
    video: 'athens-acropolis',
    alt: 'Aerial view of the Acropolis in Athens'
  },
  13: {
    stop: '14',
    name: 'Edirne, Turkey',
    description: "Known historically as Adrianople, Edirne served as the Ottoman Empire's principal capital before the conquest of Constantinople in 1453.",
    video: 'edirne-meric-bridge',
    alt: 'Aerial view of Meriç Bridge in Edirne'
  },
  14: {
    stop: '15',
    name: 'Istanbul, Turkey',
    description: 'Istanbul is a historic city spanning two continents, Europe and Asia, separated by the Bosphorus Strait. Formerly known as Constantinople, it served as the capital of both the Byzantine and Ottoman Empires.',
    video: 'istanbul-galata-tower',
    alt: 'Aerial view of Galata Tower in Istanbul'
  }
};

// Introduce each question location once for the shared game, on either player's first turn there.
export function locationForTurn(game) {
  const player = game.activePlayer;
  if (game.completedPlayers?.[player]) return null;
  const stop = Math.floor(game.players?.[player]?.position ?? 0);
  return Object.hasOwn(LOCATIONS, stop) && !(game.locationStopsSeen ?? []).includes(stop) ? stop : null;
}

export function LocationPreview(stopIndex = 0) {
  const location = LOCATIONS[stopIndex] ?? LOCATIONS[0];
  const media = `/assets/locations/episode01/${location.video}`;
  return `<section class="location-preview" role="status" aria-live="polite" aria-label="Location ${location.stop}: ${location.name}">
    <div class="location-preview-video-wrap">
      <video class="location-preview-video" autoplay muted loop playsinline preload="auto" poster="${media}.jpg" aria-label="${location.alt}">
        <source src="${media}.mp4" type="video/mp4">
      </video>
      <span class="location-preview-kicker">A PLACE ON THE ROAD</span>
    </div>
    <div class="location-preview-info">
      <div><small>STOP ${location.stop}</small><h2>${location.name}</h2><p>${location.description}</p></div>
    </div>
  </section>`;
}
