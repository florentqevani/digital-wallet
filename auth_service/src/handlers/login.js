// src/handlers/login.js - Login a client or user

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const config = require('../config');
const { createEvent } = require('../rabbitmq/log-producer');
const { permissionsForRole } = require('../permissions');

async function LoginClient(call, callback) {
    const { email, password } = call.request;

    try {
        const result = await pool.query('SELECT * FROM clients WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            console.log(`⚠ Login failed: client not found - ${email}`);
            createEvent({ actor_id: email, actor_type: 'client', action: 'LOGIN', status: 'ERROR', message: 'Client not found', timestamp: Date.now() });
            return callback(null, { token: '', role: '', success: false, message: 'Invalid email or password' });
        }

        const client = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, client.password_hash);

        if (!isPasswordValid) {
            console.log(`⚠ Login failed: invalid password - ${email}`);
            createEvent({ actor_id: email, actor_type: 'client', action: 'LOGIN', status: 'ERROR', message: 'Invalid password', timestamp: Date.now() });
            return callback(null, { token: '', role: '', success: false, message: 'Invalid email or password' });
        }

        const role = 'client';
        const token = jwt.sign(
            { id: client.id, role, permissions: permissionsForRole(role) },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry }
        );

        console.log(`✓ Client logged in: ${email}`);
        createEvent({ actor_id: client.id, actor_type: 'client', action: 'LOGIN', status: 'SUCCESS', message: `Client logged in: ${email}`, timestamp: Date.now() });

        callback(null, { token, role, permissions: permissionsForRole(role), success: true, message: 'Logged in successfully' });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        createEvent({ actor_id: email, actor_type: 'client', action: 'LOGIN', status: 'ERROR', message: error.message, timestamp: Date.now() });
        callback(null, { token: '', role: '', success: false, message: error.message });
    }
}

async function LoginUser(call, callback) {
    const { email, password } = call.request;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            console.log(`⚠ Login failed: user not found - ${email}`);
            createEvent({ actor_id: email, actor_type: 'user', action: 'LOGIN', status: 'ERROR', message: 'User not found', timestamp: Date.now() });
            return callback(null, { token: '', role: '', success: false, message: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            console.log(`⚠ Login failed: invalid password - ${email}`);
            createEvent({ actor_id: email, actor_type: 'user', action: 'LOGIN', status: 'ERROR', message: 'Invalid password', timestamp: Date.now() });
            return callback(null, { token: '', role: '', success: false, message: 'Invalid email or password' });
        }

        // Role comes from the database; auth-service signs the token
        const token = jwt.sign(
            { id: user.id, role: user.role, permissions: permissionsForRole(user.role) },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry }
        );

        console.log(`✓ User logged in: ${email} (role: ${user.role})`);
        createEvent({ actor_id: user.id, actor_type: user.role, action: 'LOGIN', status: 'SUCCESS', message: `User logged in: ${email}`, timestamp: Date.now() });

        callback(null, { token, role: user.role, permissions: permissionsForRole(user.role), success: true, message: 'Logged in successfully' });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        createEvent({ actor_id: email, actor_type: 'user', action: 'LOGIN', status: 'ERROR', message: error.message, timestamp: Date.now() });
        callback(null, { token: '', role: '', success: false, message: error.message });
    }
}

module.exports = { LoginClient, LoginUser };
