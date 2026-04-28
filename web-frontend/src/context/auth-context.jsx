import { createContext, useMemo, useState } from 'react';

const TOKEN_KEY = 'web_frontend_token';
const ROLE_KEY = 'web_frontend_role';
const PERMISSIONS_KEY = 'web_frontend_permissions';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY));
    const [permissions, setPermissions] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || '[]');
        } catch {
            return [];
        }
    });

    const isAuthenticated = Boolean(token);

    const login = ({ token: newToken, role: newRole, permissions: newPermissions = [] }) => {
        setToken(newToken);
        setRole(newRole);
        setPermissions(newPermissions);
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(ROLE_KEY, newRole);
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(newPermissions));
    };

    const logout = () => {
        setToken(null);
        setRole(null);
        setPermissions([]);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(PERMISSIONS_KEY);
    };

    const value = useMemo(
        () => ({
            token,
            role,
            permissions,
            isAuthenticated,
            login,
            logout,
        }),
        [token, role, permissions, isAuthenticated]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
