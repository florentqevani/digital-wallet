import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login-page';
import AdminDashboardPage from './pages/admin-dashboard-page';
import ClientLogsPage from './pages/client-logs-page';
import UserLogsPage from './pages/user-logs-page';
import QueryLogsPage from './pages/query-logs-page';
import UserManagementPage from './pages/user-management-page';
import BackofficeUsersPage from './pages/backoffice-users-page';
import ClientAccountsPage from './pages/client-accounts-page';
import AccountsPage from './pages/accounts-page';
import PaymentsPage from './pages/payments-page';
import TopUpPage from './pages/topup-page';
import BalancePage from './pages/balance-page';
import HistoryPage from './pages/history-page';
import NotFoundPage from './pages/not-found-page';
import ProtectedRoute from './components/protected-route';
import AppShell from './components/app-shell';

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Activity */}
                <Route path="/dashboard" element={<AdminDashboardPage />} />
                <Route path="/dashboard/client-logs" element={<ClientLogsPage />} />
                <Route path="/dashboard/user-logs" element={<UserLogsPage />} />
                <Route path="/dashboard/query" element={<QueryLogsPage />} />

                {/* Identity */}
                <Route path="/dashboard/users" element={<UserManagementPage />} />
                <Route
                    path="/dashboard/users/backoffice"
                    element={
                        <ProtectedRoute roles={['superadmin']}>
                            <BackofficeUsersPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/dashboard/users/clients" element={<ClientAccountsPage />} />

                {/* Accounts */}
                <Route path="/accounts" element={<AccountsPage />} />

                {/* Finance */}
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/payments/topup" element={<TopUpPage />} />
                <Route path="/payments/balance" element={<BalancePage />} />
                <Route path="/payments/history" element={<HistoryPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
