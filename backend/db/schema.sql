CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE elections (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    state VARCHAR(50) DEFAULT 'Created', -- Created, Started, Ended
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    contract_address VARCHAR(255),
    merkle_root VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    election_id INTEGER REFERENCES elections(id),
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    vote_count INTEGER DEFAULT 0
);

CREATE TABLE voters (
    id SERIAL PRIMARY KEY,
    election_id INTEGER REFERENCES elections(id),
    name VARCHAR(255),
    email_hash VARCHAR(255),
    phone_hash VARCHAR(255),
    wallet_address VARCHAR(255),
    passkey_hash VARCHAR(255),
    is_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(election_id, wallet_address)
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255),
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
