// src/permissions.js - Role-to-permissions mapping

const PERMISSIONS = {
    client: [
        'logs:read:own',
        'clients:balance-transfer',
    ],
    user: [
        'clients:read',
        'clients:write',
        'logs:read:own',
    ],
    superadmin: [
        'users:read',
        'users:write',
        'users:delete',
        'clients:read',
        'clients:write',
        'clients:delete',
        'logs:read:all',
        'clients:topup'
    ],
};

/**
 * Returns the permissions array for a given role.
 * Falls back to an empty array for unknown roles.
 */
function permissionsForRole(role) {
    return PERMISSIONS[role] || [];
}

module.exports = { permissionsForRole };
