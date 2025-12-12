const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Mock DB connection (should be passed or imported)
// For now, we'll assume 'req.pool' or import a singleton
// But let's use a placeholder for now and fix in server.js

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // TODO: Replace with actual DB query
    // const result = await req.pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    // const admin = result.rows[0];

    // Mock admin for MVP
    if (username === 'admin' && password === 'password') {
        const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        return res.json({ token });
    }

    res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router;
