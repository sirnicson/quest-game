export function navigation({ screen, gameScreen }) {
  const showNav = screen !== 'splash';
  if (!showNav) return '';
  const homeIcon = '<svg class="home-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 0 1 1h-5.4v-6.2H9.4V21H4a1 1 0 0 1-1-1v-9.2Z"></path></svg>';
  return `<nav class="page-navigation ${gameScreen ? 'below-hud' : ''}" aria-label="Page controls">
    <button type="button" class="btn ghost" data-action="back">← BACK</button>
    <button type="button" class="btn ghost home-button" data-action="home-reset">${homeIcon} HOME</button>
  </nav>`;
}
