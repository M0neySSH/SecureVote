const express = require('express');
const router = express.Router();
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { users, authenticators } = require('../db/mock');
const crypto = require('crypto');

const rpName = 'Blockchain Voting';
const rpID = 'localhost';
const origin = 'http://localhost:5173'; // Frontend URL

// 1. Register (Start)
router.post('/register/options', async (req, res) => {
    const { username } = req.body;

    if (!username) return res.status(400).json({ error: 'Username required' });

    // Check if user exists, if not create
    let user = users.find(u => u.username === username);
    if (!user) {
        user = {
            id: crypto.randomBytes(32).toString('base64url'), // WebAuthn user ID must be string/buffer
            username,
            currentChallenge: undefined,
        };
        users.push(user);
    }

    const userAuthenticators = authenticators.filter(auth => auth.userId === user.id);

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: user.id,
        userName: user.username,
        // Don't prompt if they already have a credential
        excludeCredentials: userAuthenticators.map(auth => ({
            id: auth.credentialID,
            type: 'public-key',
            transports: auth.transports,
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform', // Force platform (TouchID/FaceID/Hello)
        },
    });

    // Save challenge
    user.currentChallenge = options.challenge;

    res.json(options);
});

// 2. Register (Finish)
router.post('/register/verify', async (req, res) => {
    const { username, response } = req.body;
    const user = users.find(u => u.username === username);

    if (!user || !user.currentChallenge) {
        return res.status(400).json({ error: 'User or challenge not found' });
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

        const newAuthenticator = {
            credentialID,
            credentialPublicKey,
            counter,
            credentialDeviceType,
            credentialBackedUp,
            userId: user.id,
            transports: response.response.transports,
        };

        authenticators.push(newAuthenticator);
        user.currentChallenge = undefined; // Clear challenge

        res.json({ verified: true });
    } else {
        res.status(400).json({ verified: false });
    }
});

// 3. Login (Start)
router.post('/login/options', async (req, res) => {
    const { username } = req.body;
    const user = users.find(u => u.username === username);

    if (!user) return res.status(400).json({ error: 'User not found' });

    const userAuthenticators = authenticators.filter(auth => auth.userId === user.id);

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: userAuthenticators.map(auth => ({
            id: auth.credentialID,
            type: 'public-key',
            transports: auth.transports,
        })),
        userVerification: 'preferred',
    });

    user.currentChallenge = options.challenge;
    res.json(options);
});

// 4. Login (Finish)
router.post('/login/verify', async (req, res) => {
    const { username, response } = req.body;
    const user = users.find(u => u.username === username);

    if (!user || !user.currentChallenge) {
        return res.status(400).json({ error: 'User or challenge not found' });
    }

    const userAuthenticators = authenticators.filter(auth => auth.userId === user.id);
    // Find the authenticator used
    const authenticator = userAuthenticators.find(auth => auth.credentialID === response.id);

    if (!authenticator) {
        return res.status(400).json({ error: 'Authenticator not found' });
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: authenticator.credentialID,
                credentialPublicKey: authenticator.credentialPublicKey,
                counter: authenticator.counter,
                transports: authenticator.transports,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
        // Update counter
        authenticator.counter = authenticationInfo.newCounter;
        user.currentChallenge = undefined;

        // SUCCESS!
        // In a real app, we would issue a JWT here.
        // For this app, we need to return the "wallet" or "passkey" that the user can use to vote.
        // BUT, the user doesn't have the passkey if they just logged in with FaceID.
        // We need to retrieve the wallet associated with this user.

        // Let's check if there is a voter record for this user (by email/username).
        // If not, we might need to create one or link it.
        // For now, let's just return "verified: true" and the username.
        // The frontend will handle the "wallet" part or we might need to store the wallet private key encrypted in the DB 
        // and release it upon successful WebAuthn.

        // Let's look for a voter with this email/username
        const { voters } = require('../db/mock');
        let voter = voters.find(v => v.email === username);

        // If no voter exists yet, we can't give a wallet.
        // If voter exists, we return their wallet info?
        // Wait, the original flow was: Register -> Get Passkey (PrivateKey).
        // New flow: Register (WebAuthn) -> Server creates Wallet -> Server stores Wallet (Encrypted?) -> Server returns Wallet on Login?

        // For MVP:
        // If voter exists, return their wallet address and maybe the private key (INSECURE but matches current flow's logic of "user needs key").
        // Better: The frontend "VotingBooth" expects a `voterWallet` object (ethers wallet).
        // If we want to eliminate "paste passkey", the server must provide the key after auth.

        let walletPrivateKey = null;
        if (voter) {
            walletPrivateKey = voter.passkey;
        } else {
            // Create a wallet for this new WebAuthn user automatically?
            // Or wait for them to "Register" in the voting sense?
            // Let's assume they are registering for the first time if not found.
            // Actually, let's just return success and let the frontend decide.
            // But to be useful, we should probably return the key if we have it.
        }

        res.json({ verified: true, username, passkey: walletPrivateKey });
    } else {
        res.status(400).json({ verified: false });
    }
});

module.exports = router;
