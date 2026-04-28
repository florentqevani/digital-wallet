// src/handlers/user-management.js - User and client CRUD handlers

const bcrypt = require('bcrypt');
const pool = require('../db');
const { writeLog } = require('../log-producer');

async function RegisterUser(call, callback) {
    const { email, password, name, role, created_by } = call.request;

    try {
        if (!email || !password) {
            return callback(null, {
                success: false,
                message: 'Email and password are required',
            });
        }

        const safeRole = role === 'superadmin' ? 'superadmin' : 'user';
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (email, password_hash, name, role, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [email, hashedPassword, name || '', safeRole]
        );

        writeLog({
            actor_id: created_by || email,
            actor_type: 'superadmin',
            action: 'REGISTER_USER',
            status: 'SUCCESS',
            message: `User registered: ${email} (${safeRole})`,
            timestamp: Date.now(),
        });

        callback(null, { success: true, message: 'User registered successfully' });
    } catch (error) {
        writeLog({
            actor_id: created_by || email,
            actor_type: 'superadmin',
            action: 'REGISTER_USER',
            status: 'ERROR',
            message: error.message,
            timestamp: Date.now(),
        });

        callback(null, { success: false, message: error.message });
    }
}

async function ListUsers(call, callback) {
    try {
        const result = await pool.query(
            `SELECT id, email, name, role, EXTRACT(EPOCH FROM created_at)::bigint * 1000 AS created_at
             FROM users
             ORDER BY created_at DESC`
        );

        const users = result.rows.map((row) => ({
            id: row.id,
            email: row.email,
            name: row.name || '',
            role: row.role,
            created_at: row.created_at,
        }));

        callback(null, { users });
    } catch (error) {
        callback(error);
    }
}

async function UpdateUser(call, callback) {
    const { id, email, name, role, password, updated_by } = call.request;

    if (!id) {
        return callback(null, { success: false, message: 'User id is required' });
    }

    let safeRole = '';
    if (role === 'superadmin') safeRole = 'superadmin';
    else if (role === 'user') safeRole = 'user';

    const updates = [];
    const values = [];

    if (email) { values.push(email); updates.push(`email = $${values.length}`); }
    if (name) { values.push(name); updates.push(`name = $${values.length}`); }
    if (safeRole) { values.push(safeRole); updates.push(`role = $${values.length}`); }

    if (password) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            values.push(hashedPassword);
            updates.push(`password_hash = $${values.length}`);
        } catch (error) {
            return callback(null, { success: false, message: error.message });
        }
    }

    if (updates.length === 0) {
        return callback(null, { success: false, message: 'At least one field is required to update' });
    }

    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`,
            values
        );

        if (result.rowCount === 0) {
            return callback(null, { success: false, message: 'User not found' });
        }

        writeLog({
            actor_id: updated_by || id,
            actor_type: 'superadmin',
            action: 'UPDATE_USER',
            status: 'SUCCESS',
            message: `User updated: ${id}`,
            timestamp: Date.now(),
        });

        callback(null, { success: true, message: 'User updated successfully' });
    } catch (error) {
        writeLog({
            actor_id: updated_by || id,
            actor_type: 'superadmin',
            action: 'UPDATE_USER',
            status: 'ERROR',
            message: error.message,
            timestamp: Date.now(),
        });

        callback(null, { success: false, message: error.message });
    }
}

async function DeleteUser(call, callback) {
    const { id, deleted_by } = call.request;

    if (!id) {
        return callback(null, { success: false, message: 'User id is required' });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return callback(null, { success: false, message: 'User not found' });
        }

        writeLog({
            actor_id: deleted_by || id,
            actor_type: 'superadmin',
            action: 'DELETE_USER',
            status: 'SUCCESS',
            message: `User deleted: ${id}`,
            timestamp: Date.now(),
        });

        callback(null, { success: true, message: 'User deleted successfully' });
    } catch (error) {
        writeLog({
            actor_id: deleted_by || id,
            actor_type: 'superadmin',
            action: 'DELETE_USER',
            status: 'ERROR',
            message: error.message,
            timestamp: Date.now(),
        });

        callback(null, { success: false, message: error.message });
    }
}

async function ListClients(call, callback) {
    try {
        const result = await pool.query(
            `SELECT id, email, COALESCE(name, '') AS name, EXTRACT(EPOCH FROM created_at)::bigint * 1000 AS created_at
             FROM clients
             ORDER BY created_at DESC`
        );

        const clients = result.rows.map((row) => ({
            id: row.id,
            email: row.email,
            name: row.name,
            created_at: row.created_at,
        }));

        callback(null, { clients });
    } catch (error) {
        callback(error);
    }
}

async function UpdateClient(call, callback) {
    const { id, email, name, password, updated_by } = call.request;

    if (!id) {
        return callback(null, { success: false, message: 'Client id is required' });
    }

    const updates = [];
    const values = [];

    if (email) { values.push(email); updates.push(`email = $${values.length}`); }
    if (name) { values.push(name); updates.push(`name = $${values.length}`); }

    if (password) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            values.push(hashedPassword);
            updates.push(`password_hash = $${values.length}`);
        } catch (error) {
            return callback(null, { success: false, message: error.message });
        }
    }

    if (updates.length === 0) {
        return callback(null, { success: false, message: 'At least one field is required to update' });
    }

    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE clients SET ${updates.join(', ')} WHERE id = $${values.length}`,
            values
        );

        if (result.rowCount === 0) {
            return callback(null, { success: false, message: 'Client not found' });
        }

        writeLog({
            actor_id: updated_by || id,
            actor_type: 'superadmin',
            action: 'UPDATE_CLIENT',
            status: 'SUCCESS',
            message: `Client updated: ${id}`,
            timestamp: Date.now(),
        });

        callback(null, { success: true, message: 'Client updated successfully' });
    } catch (error) {
        writeLog({
            actor_id: updated_by || id,
            actor_type: 'superadmin',
            action: 'UPDATE_CLIENT',
            status: 'ERROR',
            message: error.message,
            timestamp: Date.now(),
        });

        callback(null, { success: false, message: error.message });
    }
}

async function DeleteClient(call, callback) {
    const { id, deleted_by } = call.request;

    if (!id) {
        return callback(null, { success: false, message: 'Client id is required' });
    }

    try {
        const result = await pool.query('DELETE FROM clients WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return callback(null, { success: false, message: 'Client not found' });
        }

        writeLog({
            actor_id: deleted_by || id,
            actor_type: 'superadmin',
            action: 'DELETE_CLIENT',
            status: 'SUCCESS',
            message: `Client deleted: ${id}`,
            timestamp: Date.now(),
        });

        callback(null, { success: true, message: 'Client deleted successfully' });
    } catch (error) {
        writeLog({
            actor_id: deleted_by || id,
            actor_type: 'superadmin',
            action: 'DELETE_CLIENT',
            status: 'ERROR',
            message: error.message,
            timestamp: Date.now(),
        });

        callback(null, { success: false, message: error.message });
    }
}

module.exports = {
    RegisterUser,
    ListUsers,
    UpdateUser,
    DeleteUser,
    ListClients,
    UpdateClient,
    DeleteClient,
};
