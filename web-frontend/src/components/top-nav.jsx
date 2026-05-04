import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

export default function TopNav() {
    const navigate = useNavigate();
    const { role, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="top-nav">
            <div className="top-nav-brand">
                <p className="top-nav-label">Backoffice Suite</p>
                <h1>Operations Console</h1>
            </div>

            <nav className="top-nav-links">
                <NavLink to="/my-logs" className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`}>
                    My Logs
                </NavLink>
                {(role === 'user' || role === 'superadmin') && (
                    <NavLink end to="/dashboard" className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`}>
                        Dashboard
                    </NavLink>
                )}
                {(role === 'user' || role === 'superadmin') && (
                    <NavLink to="/dashboard/users" className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`}>
                        {role === 'superadmin' ? 'Users' : 'Clients'}
                    </NavLink>
                )}
                {(role === 'user' || role === 'superadmin') && (
                    <NavLink to="/accounts" className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`}>
                        Accounts
                    </NavLink>
                )}
            </nav>
            <div className="top-nav-actions">
                <span className="role-chip">{role}</span>
                <button type="button" onClick={handleLogout}>Sign out</button>
            </div>
        </header>
    );
}
