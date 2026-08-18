import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppUser } from '../db';
import {
  authenticateUser,
  createUser,
  getUserById,
  hasAnyUser,
} from '../services/userService';
import { hasPermission, Permission, UserRole } from '../utils/permissions';

const SESSION_KEY = 'pharmacy_session_user_id';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  needsSetup: boolean;
  login: (userId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  setupManager: (name: string, pin: string) => Promise<void>;
  can: (permission: Permission) => boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const anyUser = await hasAnyUser();
        if (cancelled) return;

        if (!anyUser) {
          setNeedsSetup(true);
          return;
        }

        const sessionId = sessionStorage.getItem(SESSION_KEY);
        if (sessionId) {
          const sessionUser = await getUserById(sessionId);
          if (sessionUser?.active) setUser(sessionUser);
          else sessionStorage.removeItem(SESSION_KEY);
        }
      } catch (err) {
        console.error('[Auth] Database init failed:', err);
        if (!cancelled) setNeedsSetup(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (userId: string, pin: string) => {
    const authenticated = await authenticateUser(userId, pin);
    if (!authenticated) return false;
    sessionStorage.setItem(SESSION_KEY, authenticated.id);
    setUser(authenticated);
    setNeedsSetup(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const setupManager = useCallback(async (name: string, pin: string) => {
    const manager = await createUser(name, 'manager', pin);
    sessionStorage.setItem(SESSION_KEY, manager.id);
    setUser(manager);
    setNeedsSetup(false);
  }, []);

  const can = useCallback(
    (permission: Permission) => {
      if (!user) return false;
      return hasPermission(user.role as UserRole, permission);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsSetup,
        login,
        logout,
        setupManager,
        can,
        isManager: user?.role === 'manager',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
