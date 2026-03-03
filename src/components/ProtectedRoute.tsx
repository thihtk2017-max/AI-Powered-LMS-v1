import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import type { ReactElement } from 'react';

interface ProtectedRouteProps {
  children: ReactElement;
  role: 'teacher' | 'student';
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== role) {
    // If logged in but wrong role, redirect to their correct dashboard
    const correctPath = currentUser.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={correctPath} replace />;
  }

  return children;
}
