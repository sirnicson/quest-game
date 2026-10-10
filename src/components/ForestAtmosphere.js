export function forestAtmosphere(extraClass='') {
  return `<div class="forest-atmosphere ${extraClass}" aria-hidden="true">
    <video class="forest-atmosphere__video" autoplay muted loop playsinline preload="auto" poster="./assets/opening/forest-live.png">
      <source src="./assets/opening/forest-live.mp4" type="video/mp4">
    </video>
    <div class="forest-atmosphere__image"></div>
    <div class="forest-atmosphere__mist"></div>
    <div class="forest-atmosphere__light"></div>
    <div class="forest-atmosphere__birds">
      <span class="forest-bird bird-1">⌁</span>
      <span class="forest-bird bird-2">⌁</span>
      <span class="forest-bird bird-3">⌁</span>
    </div>
    <div class="forest-atmosphere__insects">
      <i class="firefly f1"></i><i class="firefly f2"></i><i class="firefly f3"></i>
      <i class="firefly f4"></i><i class="firefly f5"></i><i class="firefly f6"></i>
    </div>
  </div>`;
}
