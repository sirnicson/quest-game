export function livingMountain() {
  return `<div class="living-mountain" aria-hidden="true">
    <video class="living-mountain__video" autoplay muted loop playsinline preload="auto" poster="./assets/opening/alpine-home.png">
      <source src="./assets/opening/alpine-home.mp4" type="video/mp4">
    </video>
    <div class="living-mountain__fallback"></div>
    <div class="living-mountain__birds">
      <span class="mountain-bird mb1">⌁</span><span class="mountain-bird mb2">⌁</span><span class="mountain-bird mb3">⌁</span>
    </div>
    <div class="living-mountain__mist"></div>
  </div>`;
}
