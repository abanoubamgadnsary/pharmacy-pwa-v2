export async function hashPin(userId: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${pin}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(
  userId: string,
  pin: string,
  pinHash: string,
): Promise<boolean> {
  const computed = await hashPin(userId, pin);
  return computed === pinHash;
}
