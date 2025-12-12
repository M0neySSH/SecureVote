import React, { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import axios from 'axios';

const WebAuthnLogin = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleRegister = async () => {
        setMessage('');
        setIsError(false);
        try {
            // 1. Get options from server
            const resp = await axios.post('http://localhost:3000/api/webauthn/register/options', { username });

            // 2. Pass options to browser authenticator
            let attResp;
            try {
                attResp = await startRegistration(resp.data);
            } catch (error) {
                if (error.name === 'InvalidStateError') {
                    throw new Error('Authenticator already registered for this user.');
                }
                throw error;
            }

            // 3. Send response to server
            const verificationResp = await axios.post('http://localhost:3000/api/webauthn/register/verify', {
                username,
                response: attResp,
            });

            if (verificationResp.data.verified) {
                setMessage('Registration successful! You can now login.');
            } else {
                setIsError(true);
                setMessage('Registration failed on server.');
            }
        } catch (error) {
            console.error(error);
            setIsError(true);
            setMessage(error.message || 'Registration failed');
        }
    };

    const handleLogin = async () => {
        setMessage('');
        setIsError(false);
        try {
            // 1. Get options
            const resp = await axios.post('http://localhost:3000/api/webauthn/login/options', { username });

            // 2. Pass to browser
            let asseResp;
            try {
                asseResp = await startAuthentication(resp.data);
            } catch (error) {
                throw error;
            }

            // 3. Verify
            const verificationResp = await axios.post('http://localhost:3000/api/webauthn/login/verify', {
                username,
                response: asseResp,
            });

            if (verificationResp.data.verified) {
                setMessage('Login successful!');
                if (onLoginSuccess) {
                    onLoginSuccess(verificationResp.data.username, verificationResp.data.passkey);
                }
            } else {
                setIsError(true);
                setMessage('Login failed on server.');
            }
        } catch (error) {
            console.error(error);
            setIsError(true);
            setMessage(error.message || 'Login failed');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Biometric Login</h2>
            <p className="mb-4 text-sm text-gray-500">
                Use your fingerprint, face ID, or device PIN to secure your vote.
            </p>

            <input
                type="text"
                className="w-full p-2 border rounded mb-4 dark:bg-gray-700"
                placeholder="Enter Username / Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />

            <div className="flex gap-4">
                <button
                    onClick={handleRegister}
                    className="flex-1 bg-gray-600 text-white p-2 rounded hover:bg-gray-700"
                >
                    Register Device
                </button>
                <button
                    onClick={handleLogin}
                    className="flex-1 bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
                >
                    Login
                </button>
            </div>

            {message && (
                <div className={`mt-4 p-2 rounded text-sm ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default WebAuthnLogin;
