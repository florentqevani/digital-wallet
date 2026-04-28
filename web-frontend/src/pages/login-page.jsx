import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { loginRequest } from '../lib/api';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [form, setForm] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await loginRequest(form);

            if (!response?.success || !response?.token) {
                throw new Error(response?.message || 'Invalid credentials');
            }

            login({ token: response.token, role: response.role, permissions: response.permissions || [] });

            const redirectTo = location.state?.from;

            if (redirectTo) {
                navigate(redirectTo, { replace: true });
            } else if (response.role === 'superadmin') {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/my-logs', { replace: true });
            }
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <p className="top-nav-label">Secure Access</p>
                <h1>Operations Backoffice</h1>
                <p>Sign in to investigate activity, monitor system events, and manage backoffice users.</p>
                <form onSubmit={onSubmit}>
                    <label>
                        <span>Email</span>
                        <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={onChange}
                            placeholder="admin@example.com"
                            required
                        />
                    </label>
                    <label>
                        <span>Password</span>
                        <input
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={onChange}
                            placeholder="••••••••"
                            required
                        />
                    </label>
                    {error && <p className="error-text">{error}</p>}
                    <button type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
                <div className="auth-meta">
                    <span>Audit-Ready</span>
                    <span>Role-Based Access</span>
                    <span>Realtime Visibility</span>
                </div>
            </section>
        </main>
    );
}