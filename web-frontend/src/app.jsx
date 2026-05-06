import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login-page';
import MyLogsPage from './pages/my-logs-page';
import AdminDashboardPage from './pages/admin-dashboard-page';
import UserManagementPage from './pages/user-management-page';
import AccountsPage from './pages/accounts-page';
import PaymentsPage from './pages/payments-page';
import NotFoundPage from './pages/not-found-page';
import ProtectedRoute from './components/protected-route';
import AppShell from './components/app-shell';
import { useAuth } from './hooks/use-auth';

function HomeRedirect() {
    const { role } = useAuth();
    return (role === 'superadmin' || role === 'user')
        ? <Navigate to="/dashboard" replace />
        : <Navigate to="/my-logs" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated layout — sidebar + content */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/my-logs" element={<MyLogsPage />} />
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
                <Route
                    path="/accounts"
                    element={
                        <ProtectedRoute roles={['user', 'superadmin']}>
                            <AccountsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/payments"
                    element={
                        <ProtectedRoute roles={['user', 'superadmin']}>
                            <PaymentsPage />
                        </ProtectedRoute>
                    }
                />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
