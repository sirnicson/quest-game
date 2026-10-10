const dir = '/assets/avatar new/';

export const avatarFiles = [
  ['Batman', 'batman.jpg'], ['Superman', 'superman.jpg'], ['Spider-Man', 'spiderman.jpg'], ['Wonder Woman', 'wonder woman.jpg'],
  ['Messi', 'lmessi.jpg'], ['Ronaldo', 'cronaldo.jpg'], ['Haaland', 'haaland.jpg'], ['Mbappé', 'mbappe.jpg'],
  ['Osimhen', 'osimhen.jpg'], ['Elon Musk', 'elonmusk.jpg'], ['Putin', 'putin.jpg'], ['Trump', 'trump.jpg'],
  ['Black Panther', 'blackpanther.jpg'], ['Beyonc\u00e9', 'beyonce.jpg'], ['Kim Kardashian', 'kim kardasian.jpg'], ['Queen Elizabeth', 'queen elizabeth.jpg'],
  ['Atat\u00fcrk', 'ataturk.jpg'], ['Didi', 'didi.webp']
].map(([label, file]) => ({ label, src: encodeURI(dir + file) }));

export const isImageAvatar = value => typeof value === 'string' && value.startsWith('/assets/');
const attr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export function avatarHtml(value, className = 'avatar-img') {
  return isImageAvatar(value) ? `<img class="${className}" src="${attr(value)}" alt="">` : String(value).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function avatarSvg(value, id) {
  if (!isImageAvatar(value)) return `<text class="avatar-mark" y="5" text-anchor="middle">${avatarHtml(value)}</text>`;
  return `<clipPath id="avatar-clip-${id}"><circle r="12"></circle></clipPath><image class="avatar-photo" href="${attr(value)}" x="-12" y="-12" width="24" height="24" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip-${id})"></image><circle class="avatar-ring" r="12"></circle>`;
}
