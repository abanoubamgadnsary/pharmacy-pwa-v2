/**
 * Master recovery key — generated once during setup, used to reset any user's PIN.
 * The key itself is shown once to the user; only its SHA-256 hash is stored.
 */

/** Generate a 12-character alphanumeric recovery key (easy to write down). */
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** Format key with dashes for readability: XXXX-XXXX-XXXX */
export function formatRecoveryKey(key: string): string {
  return key.replace(/(.{4})(?=.)/g, '$1-');
}

export async function hashRecoveryKey(key: string): Promise<string> {
  const normalized = key.replace(/[\s-]/g, '').toUpperCase();
  const data = new TextEncoder().encode(`recovery:${normalized}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyRecoveryKey(
  inputKey: string,
  storedHash: string,
): Promise<boolean> {
  const computed = await hashRecoveryKey(inputKey);
  return computed === storedHash;
}
