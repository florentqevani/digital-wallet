import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login-page';
import MyLogsPage from './pages/my-logs-page';
import AdminDashboardPage from './pages/admin-dashboard-page';
import UserManagementPage from './pages/user-management-page';
import NotFoundPage from './pages/not-found-page';
import ProtectedRoute from './components/protected-route';
import { useAuth } from './hooks/use-auth';

function HomeRedirect() {
    const { role } = useAuth();

    if (role === 'superadmin' || role === 'user') {
        return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/my-logs" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/my-logs"
                element={
                    <ProtectedRoute roles={['user', 'superadmin']}>
                        <MyLogsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute roles={['user', 'superadmin']}>
                        <AdminDashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboard/users"
                element={
                    <ProtectedRoute roles={['user', 'superadmin']}>
                        <UserManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
