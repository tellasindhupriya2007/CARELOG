import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

export default function PrivateRoute({ allowedRoles }) {
    const { user, role, loading } = useAuthContext();
    const location = useLocation();

    if (loading) {
        return null; // The loading animation is handled globally by AuthContext
    }

    if (!user) {
        // If not logged in redirect to /auth/splash
        return <Navigate to="/auth/splash" state={{ from: location }} replace />;
    }

    // If logged in redirect to correct dashboard based on user role stored in Firebase Auth.
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        if (role === 'caretaker') return <Navigate to="/caretaker/dashboard" replace />;
        if (role === 'family') return <Navigate to="/family/dashboard" replace />;
        if (role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
        return <Navigate to="/auth/splash" replace />;
    }

    return <Outlet />;
}
