import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

const NAV_ITEMS = [
    { to: '/dashboard',       label: 'Dashboard', icon: '▤', end: true,  roles: ['user', 'superadmin'] },
    { to: '/dashboard/users', label: 'Users',     icon: '👤',            roles: ['user', 'superadmin'] },
    { to: '/accounts',        label: 'Accounts',  icon: '🪙',            roles: ['user', 'superadmin'] },
    { to: '/payments',        label: 'Payments',  icon: '💳',            roles: ['user', 'superadmin'] },
    { to: '/my-logs',         label: 'My Logs',   icon: '📋',            roles: ['user', 'superadmin'] },
];

export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const { role, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

    return (
        <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
            <div className="sidebar-brand">
                {!collapsed && (
                    <div className="sidebar-brand-text">
                        <span className="sidebar-eyebrow">Backoffice Suite</span>
                        <h1 className="sidebar-title">Operations</h1>
                    </div>
                )}
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={onToggle}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? '☰' : '☰'}
                </button>
            </div>

            <nav className="sidebar-nav" aria-label="Main navigation">
                {visible.map(({ to, label, icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
                        }
                    >
                        <span className="sidebar-icon" aria-hidden="true">{icon}</span>
                        {!collapsed && label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {!collapsed && <span className="role-chip">{role}</span>}
                <button
                    type="button"
                    className="button-muted sidebar-signout"
                    onClick={handleLogout}
                    title="Sign out"
                >
                    {collapsed ? '↩' : 'Sign out'}
                </button>
            </div>
        </aside>
    );
}
