import { db, AppUser, readyDb } from '../db';
import { generateId } from '../utils/id';
import { hashPin, verifyPin } from '../utils/pin';
import { isValidPin, UserRole } from '../utils/permissions';

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
