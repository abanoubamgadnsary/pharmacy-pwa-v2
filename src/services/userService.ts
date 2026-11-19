import { db, AppUser, readyDb } from '../db';
import { generateId } from '../utils/id';
import { hashPin, verifyPin } from '../utils/pin';
import { isValidPin, UserRole } from '../utils/permissions';
import {
  generateRecoveryKey,
  hashRecoveryKey,
  verifyRecoveryKey,
} from '../utils/recovery';

export async function hasAnyUser(): Promise<boolean> {
  await readyDb();
  return (await db.users.count()) > 0;
}

export async function getActiveUsers(): Promise<AppUser[]> {
  await readyDb();
  return db.users.filter((u) => u.active).toArray();
}

export async function getUserById(id: string): Promise<AppUser | undefined> {
  await readyDb();
  return db.users.get(id);
}

export async function createUser(
  name: string,
  role: UserRole,
  pin: string,
): Promise<AppUser> {
  await readyDb();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is required');
  if (!isValidPin(pin)) throw new Error('Invalid PIN');

  const id = generateId();
  const user: AppUser = {
    id,
    name: trimmed,
    role,
    pinHash: await hashPin(id, pin),
    active: true,
    createdAt: new Date(),
  };
  await db.users.add(user);
  return user;
}

export async function authenticateUser(
  userId: string,
  pin: string,
): Promise<AppUser | null> {
  await readyDb();
  const user = await db.users.get(userId);
  if (!user || !user.active) return null;
  const ok = await verifyPin(userId, pin, user.pinHash);
  return ok ? user : null;
}

export async function updateUserPin(userId: string, pin: string): Promise<void> {
  await readyDb();
  if (!isValidPin(pin)) throw new Error('Invalid PIN');
  await db.users.update(userId, { pinHash: await hashPin(userId, pin) });
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  await readyDb();
  if (!active) {
    const user = await db.users.get(userId);
    if (user?.role === 'manager') {
      const managerCount = await db.users.filter(
        (u) => u.role === 'manager' && u.active,
      ).count();
      if (managerCount <= 1) throw new Error('Cannot deactivate the last manager');
    }
  }
  await db.users.update(userId, { active });
}

// ── Recovery key ──────────────────────────────────────────────────────────────

const RECOVERY_KEY_SETTING = 'recovery_key_hash';

/** Generate a new recovery key, store its hash, and return the plain key (show once). */
export async function createRecoveryKey(): Promise<string> {
  await readyDb();
  const key = generateRecoveryKey();
  const hash = await hashRecoveryKey(key);
  await db.settings.put({ key: RECOVERY_KEY_SETTING, value: hash });
  return key;
}

/** Check whether a recovery key has been set up. */
export async function hasRecoveryKey(): Promise<boolean> {
  await readyDb();
  const row = await db.settings.get(RECOVERY_KEY_SETTING);
  return !!row?.value;
}

/** Verify the user-entered recovery key against the stored hash. */
export async function checkRecoveryKey(inputKey: string): Promise<boolean> {
  await readyDb();
  const row = await db.settings.get(RECOVERY_KEY_SETTING);
  if (!row?.value) return false;
  return verifyRecoveryKey(inputKey, row.value);
}

/** Reset a user's PIN using the recovery key (verifies key first). */
export async function resetPinWithRecoveryKey(
  inputKey: string,
  userId: string,
  newPin: string,
): Promise<boolean> {
  const valid = await checkRecoveryKey(inputKey);
  if (!valid) return false;
  await updateUserPin(userId, newPin);
  return true;
}
