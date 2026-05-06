// src/handlers/register.js - Register a new client

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const config = require('../config');
const { createEvent } = require('../rabbitmq/log-producer');
const { publishClientRegistered } = require('../rabbitmq/account-producer');
const { permissionsForRole } = require('../permissions');

async function RegisterClient(call, callback) {
    const { email, password, name } = call.request;

    try {
        if (!email || !password) {
            return callback(null, {
                token: '',
                role: '',
                success: false,
                message: 'Email and password are required',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO clients (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
            [email, hashedPassword, name || '']
        );

        const client = result.rows[0];
        console.log(`✓ Client registered: ${client.email}`);

        const role = 'client';
        const token = jwt.sign(
            { id: client.id, name: client.name || '', role, permissions: permissionsForRole(role) },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry }
        );

        createEvent({
            actor_id: client.id,
            actor_type: 'client',
            action: 'REGISTER',
            status: 'SUCCESS',
            message: `Client registered: ${email}`,
            timestamp: Date.now(),
        });

        publishClientRegistered(client.id);

        callback(null, {
            token,
            role,
            permissions: permissionsForRole(role),
            success: true,
            message: 'Registered successfully',
        });
    } catch (error) {
        console.error('❌ Registration error:', error.message);

        createEvent({
            actor_id: email,
            actor_type: 'client',
            action: 'REGISTER',
            status: 'ERROR',
            message: error.message,
            timestamp: Date.now(),
        });

        callback(null, {
            token: '',
            role: '',
            success: false,
            message: error.message,
        });
    }
}

module.exports = { RegisterClient };
