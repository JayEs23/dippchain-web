// Simple client-side email session helpers used for gating dashboard access.
// We persist to both localStorage and a short-lived cookie for basic continuity.
const EMAIL_KEY = 'dippchainEmail';

export function setEmailSession(email) {
  if (typeof window === 'undefined') return;
  const normalized = (email || '').trim();
  if (!normalized) return;
  try {
    localStorage.setItem(EMAIL_KEY, normalized);
    document.cookie = `${EMAIL_KEY}=${encodeURIComponent(normalized)}; path=/; max-age=${60 * 60 * 24 * 7}`;
  } catch (err) {
    console.warn('Failed to persist email session', err);
  }
}

export function getEmailSession() {
  if (typeof window === 'undefined') return null;
  try {
    const local = localStorage.getItem(EMAIL_KEY);
    if (local) return local;
    const cookie = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${EMAIL_KEY}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
  } catch (err) {
    console.warn('Failed to read email session', err);
    return null;
  }
}

export function clearEmailSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(EMAIL_KEY);
    document.cookie = `${EMAIL_KEY}=; path=/; max-age=0`;
  } catch (err) {
    console.warn('Failed to clear email session', err);
  }
}


