export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

export function button(label, action='next', cls='primary') {
  return `<button type="button" class="btn ${cls}" data-action="${action}">${label}</button>`;
}

export const laneClass = lane => lane.toLowerCase();
export const laneColor = lane => ({
  Quiz:'#2a9d72',
  Speaking:'#d65a4a',
  Reading:'#3f72c9',
  Listening:'#7652b5',
  Writing:'#c98a20'
}[lane]);

export function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
