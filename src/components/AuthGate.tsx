import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessPath, UserRole } from '../utils/permissions';

export const AuthGate: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  if (!canAccessPath(user.role as UserRole, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
