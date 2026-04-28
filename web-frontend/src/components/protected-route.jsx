import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

export default function ProtectedRoute({ children, roles = [] }) {
    const location = useLocation();
    const { isAuthenticated, role } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (roles.length > 0 && !roles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
