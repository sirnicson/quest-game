const KEY = 'quest-session';

export function saveSession(game) {
  try { localStorage.setItem(KEY, JSON.stringify(game)); } catch {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
}
