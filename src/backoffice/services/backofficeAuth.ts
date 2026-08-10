const TOKEN_KEY = 'brentrix_backoffice_token';
const OWNER_KEY = 'brentrix_backoffice_owner';

export interface BackofficeOwner {
  id: string;
  nombre: string;
  email: string;
}

function safeRead(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeWrite(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
}

function safeRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

export function getBackofficeToken(): string | null {
  return safeRead(TOKEN_KEY);
}

export function setBackofficeToken(token: string): void {
  safeWrite(TOKEN_KEY, token);
}

export function getBackofficeOwner(): BackofficeOwner | null {
  const raw = safeRead(OWNER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setBackofficeOwner(owner: BackofficeOwner): void {
  safeWrite(OWNER_KEY, JSON.stringify(owner));
}

export function clearBackofficeSession(): void {
  safeRemove(TOKEN_KEY);
  safeRemove(OWNER_KEY);
}
