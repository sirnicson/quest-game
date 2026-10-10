const KEY = 'quest-room';

export const roomCodeFromUrl = () => {
  const code = new URLSearchParams(location.search).get('room') || '';
  return /^[A-Za-z0-9]{4}$/.test(code) ? code.toUpperCase() : null;
};

export const inviteLink = code => `${location.origin}${location.pathname}?room=${code}`;

export const saveSession = session => sessionStorage.setItem(KEY, JSON.stringify(session));
export const clearSession = () => sessionStorage.removeItem(KEY);
export const loadSession = () => {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return session?.code && session?.token ? session : null;
  } catch { return null; }
};

async function post(url, body) {
  const response = await fetch(url, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'POST' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'failed'), { reason: data.error || 'failed' });
  return data;
}

export const createRoom = () => post('/api/rooms');
export const joinRoom = code => post(`/api/rooms/${code}/join`);
export const sendProfile = (session, profile) => post(`/api/rooms/${session.code}/profile`, { token: session.token, ...profile }).catch(() => null);
export const sendReady = (session, ready = true) => post(`/api/rooms/${session.code}/ready`, { token: session.token, ready }).catch(() => null);
export const sendAct = (session, act) => post(`/api/rooms/${session.code}/act`, { token: session.token, ...act }).catch(() => null);
export const roomStatus = code => fetch(`/api/rooms/${code}`).then(r => r.json()).catch(() => ({ exists: false }));

// Streams room snapshots. Returns a function that closes the connection.
export function connectRoom(session, { onRoom, onAct, onDenied }) {
  const stream = new EventSource(`/api/rooms/${session.code}/events?token=${encodeURIComponent(session.token)}`);
  stream.addEventListener('room', event => onRoom(JSON.parse(event.data)));
  stream.addEventListener('act', event => onAct?.(JSON.parse(event.data)));
  stream.addEventListener('denied', () => { stream.close(); onDenied?.(); });
  return () => stream.close();
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
