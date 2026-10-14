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
  }
};

// Match the stop used by the next player's question, including repeat turns.
export function locationForTurn(game) {
  const player = game.activePlayer;
  if (game.completedPlayers?.[player]) return null;
  const stop = Math.floor(game.players?.[player]?.position ?? 0);
  return Object.hasOwn(LOCATIONS, stop) ? stop : null;
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
