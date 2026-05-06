import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

const NAV_GROUPS = [
    {
        label: 'Logs',
        items: [
            { to: '/dashboard',            label: 'Overview',    icon: '▤', end: true,  roles: ['user', 'superadmin'] },
            { to: '/dashboard/client-logs', label: 'Client Logs', icon: '📊',            roles: ['user', 'superadmin'] },
            { to: '/dashboard/user-logs',   label: 'User Logs',   icon: '👥',            roles: ['user', 'superadmin'] },
            { to: '/dashboard/query',       label: 'Query',       icon: '🔍',            roles: ['user', 'superadmin'] },
        ],
    },
    {
        label: 'Users & Clients',
        items: [
            { to: '/dashboard/users',              label: 'Overview',    icon: '▦', end: true,  roles: ['user', 'superadmin'] },
            { to: '/dashboard/users/backoffice',   label: 'Backoffice',  icon: '🛡',            roles: ['superadmin'] },
            { to: '/dashboard/users/clients',      label: 'Clients',     icon: '🪪',            roles: ['user', 'superadmin'] },
        ],
    },
    {
        label: 'Payments',
        items: [
            { to: '/payments/topup',   label: 'Top-Up',  icon: '💳', roles: ['user', 'superadmin'] },
            { to: '/payments/balance', label: 'Balance', icon: '💰', roles: ['user', 'superadmin'] },
            { to: '/payments/history', label: 'History', icon: '📝', roles: ['user', 'superadmin'] },
        ],
    },
    {
        label: 'Accounts',
        items: [
            { to: '/accounts', label: 'All Accounts', icon: '🪙', roles: ['user', 'superadmin'] },
        ],
    },
];

export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate();
    const { role, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

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
                {NAV_GROUPS.map((group) => {
                    const visibleItems = group.items.filter((item) => item.roles.includes(role));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div key={group.label} className="sidebar-group">
                            {!collapsed && (
                                <span className="sidebar-group-label">{group.label}</span>
                            )}
                            {visibleItems.map(({ to, label, icon, end }) => (
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
                        </div>
                    );
                })}
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
