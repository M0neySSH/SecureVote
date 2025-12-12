require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Routes
const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/election');
const voterRoutes = require('./routes/voter');
const faucetRoutes = require('./routes/faucet');

app.use('/api/auth', authRoutes);
app.use('/api/election', electionRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/faucet', faucetRoutes);
app.use('/api/webauthn', require('./routes/webauthn'));

app.get('/', (req, res) => {
    res.send('Blockchain Voting System API');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
