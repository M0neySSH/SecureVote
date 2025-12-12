import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { ELECTION_ABI } from '../contractConfig';

function VotingBooth() {
    const [passkey, setPasskey] = useState('');
    const [voterWallet, setVoterWallet] = useState(null); // The wallet derived from passkey
    const [elections, setElections] = useState([]);
    const [selectedElection, setSelectedElection] = useState(null);
    const [contractState, setContractState] = useState(null);
    const [voteHash, setVoteHash] = useState(''); // To store the transaction hash
    const [isDeviceVerified, setIsDeviceVerified] = useState(false); // Gatekeeper state

    useEffect(() => {
        fetchElections();
    }, []);

    useEffect(() => {
        if (selectedElection && selectedElection.address) {
            checkContractState(selectedElection.address);
        } else {
            setContractState(null);
        }
    }, [selectedElection]);

    const fetchElections = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/election');
            setElections(res.data.elections);
            if (res.data.elections && res.data.elections.length > 0) {
                setSelectedElection(res.data.elections[0]);
            }
        } catch (err) {
            console.error("Failed to fetch elections");
        }
    };

    // Double Verification: Trigger Windows Hello / Touch ID
    const verifyDevice = async () => {
        try {
            // Helper to convert ArrayBuffer to Base64
            const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
            // Helper to convert Base64 to Uint8Array
            const base64ToUint8Array = (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

            const savedCredentialId = localStorage.getItem('device_credential_id');
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            if (savedCredentialId) {
                // 1. Authenticate (Login) - No "Save" prompt
                console.log("Attempting to verify with saved credential...");
                await navigator.credentials.get({
                    publicKey: {
                        challenge: challenge,
                        allowCredentials: [{
                            id: base64ToUint8Array(savedCredentialId),
                            type: 'public-key',
                            transports: ['internal']
                        }],
                        userVerification: 'required',
                    }
                });
            } else {
                // 2. Register (First Time) - Might ask to save
                console.log("No saved credential, creating new one...");
                const options = {
                    publicKey: {
                        challenge: challenge,
                        rp: { name: "Unlock Voting Booth" }, // Changed name to be clear it's just for unlocking
                        user: {
                            id: new Uint8Array(16),
                            name: "device_user",
                            displayName: "Device User"
                        },
                        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                        timeout: 60000,
                        authenticatorSelection: {
                            authenticatorAttachment: "platform",
                            userVerification: "required"
                        }
                    }
                };
                const credential = await navigator.credentials.create(options);
                // Save the ID so next time we just "get" it
                const newCredId = bufferToBase64(credential.rawId);
                localStorage.setItem('device_credential_id', newCredId);
            }

            setIsDeviceVerified(true);
        } catch (err) {
            console.error(err);
            // If verification fails but we had a saved ID, it might be stale/invalid.
            if (localStorage.getItem('device_credential_id')) {
                localStorage.removeItem('device_credential_id'); // Clear it
                alert("Verification failed. Please try again.");
            } else {
                alert("Verification Failed. You must validly authenticate with your device.");
            }
        }
    };

    const checkContractState = async (address) => {
        try {
            const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            const contract = new ethers.Contract(address, ELECTION_ABI, provider);
            const state = await contract.state();
            const states = ["Created", "Started", "VotingEnded", "RevealEnded"];
            setContractState(states[state]);
        } catch (err) {
            console.error("Failed to fetch contract state", err);
            setContractState("Error");
        }
    };

    const handleVote = async (candidateId) => {
        if (!voterWallet) return alert("Login with passkey first");

        if (contractState !== "Started") {
            return alert(`Voting is NOT active. State: ${contractState}`);
        }

        try {
            // Check Balance
            const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            const balance = await provider.getBalance(voterWallet.address);

            if (balance === 0n) {
                const confirm = window.confirm("Your wallet has 0 ETH. Request free test funds to vote?");
                if (confirm) {
                    try {
                        alert("Requesting funds... Please wait.");
                        await axios.post('http://localhost:3000/api/faucet', { address: voterWallet.address });
                        alert("Funds received! Proceeding to vote...");
                    } catch (faucetErr) {
                        console.error("Faucet failed", faucetErr);
                        return alert("Failed to get funds. Please try again or contact admin.");
                    }
                } else {
                    return;
                }
            }

            // 1. Fetch Merkle Proof
            console.log(`Fetching proof for: ${voterWallet.address} (Election ${selectedElection.id})`);
            const proofRes = await axios.get(`http://localhost:3000/api/election/${selectedElection.id}/proof?address=${voterWallet.address}`);
            const proof = proofRes.data.proof;

            // 2. Send Vote Transaction (Signed by Voter Wallet)
            const connectedWallet = voterWallet.connect(provider);
            const contract = new ethers.Contract(selectedElection.address, ELECTION_ABI, connectedWallet);

            console.log("Sending vote...");
            const tx = await contract.vote(candidateId, proof);
            console.log("Tx Hash:", tx.hash);

            const receipt = await tx.wait();

            setVoteHash(tx.hash);
            alert(`✅ Vote Cast Successfully!\n\nTransaction Hash: ${tx.hash}\n\nYour vote has been counted immediately.`);
        } catch (err) {
            console.error("Voting Error:", err);
            const msg = err.reason || err.message || "Unknown error";
            alert(`Error: ${msg}`);
        }
    };

    return (
        <div className="container mx-auto p-8 text-center">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Voting Booth</h1>

                <div className="flex items-center gap-4">
                    <select
                        className="p-2 border rounded dark:bg-gray-700"
                        value={selectedElection ? selectedElection.id : ''}
                        onChange={(e) => {
                            const found = elections.find(el => el.id == e.target.value);
                            setSelectedElection(found);
                            setVoteHash(''); // Clear hash on switch
                        }}
                    >
                        {elections.map(e => (
                            <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                    </select>

                    {contractState && (
                        <div className={`px-4 py-2 rounded font-bold ${contractState === "Started" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            State: {contractState}
                        </div>
                    )}
                </div>
            </div>

            {!voterWallet ? (
                <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded shadow-lg">
                    <h2 className="text-xl font-bold mb-6">Voter Login</h2>

                    {!isDeviceVerified ? (
                        <div className="text-center">
                            <div className="mb-6 text-6xl">🔒</div>
                            <p className="mb-6 text-gray-600 dark:text-gray-300">
                                This Voting Booth is protected.
                                <br />
                                Please verify your device identity (Windows Hello / Fingerprint) to continue.
                            </p>
                            <button
                                onClick={verifyDevice}
                                className="w-full bg-indigo-600 text-white p-4 rounded font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                🛡️ Verify Device Identity
                            </button>
                            <p className="mt-4 text-xs text-gray-500 max-w-sm mx-auto">
                                ℹ️ <strong>Note:</strong> We do NOT save your Voting Password.
                                This creates a temporary "Device Key" just to unlock this screen (like unlocking your phone).
                            </p>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="mb-4 text-green-500 font-bold flex items-center justify-center gap-2">
                                ✅ Device Verified
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Enter your Private Key (Passkey) from Registration:</p>
                            <input
                                type="password"
                                className="w-full p-3 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Paste Passkey (0x...)"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                            />
                            <button
                                onClick={() => {
                                    try {
                                        if (!passkey) return alert("Enter passkey");
                                        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
                                        const wallet = new ethers.Wallet(passkey, provider);
                                        setVoterWallet(wallet);
                                    } catch (e) { alert("Invalid key"); }
                                }}
                                className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition-colors"
                            >
                                Access Voting Booth
                            </button>
                            <p className="text-xs text-gray-400 mt-4">Note: Your passkey is never sent to the server. It signs votes locally.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <p className="mb-4 text-green-600 font-bold">Logged in as: {voterWallet.address}</p>

                    <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-4">
                            {selectedElection ? `Vote in: ${selectedElection.title}` : "No Active Election"}
                        </h2>

                        {selectedElection && (
                            <p className="text-xs text-gray-400 mb-4">Contract: {selectedElection.address}</p>
                        )}

                        {voteHash && (
                            <div className="mb-8 p-4 bg-green-100 border border-green-400 text-green-800 rounded break-all">
                                <h3 className="font-bold">✅ Vote Cast Successfully!</h3>
                                <p className="text-sm mt-2">Transaction Hash (Proof of Vote):</p>
                                <code className="block bg-white p-2 rounded mt-1 text-xs">{voteHash}</code>
                            </div>
                        )}

                        {selectedElection && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                {selectedElection.candidates.map(candidate => (
                                    <div key={candidate.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                        {candidate.photoUrl ? (
                                            <img src={candidate.photoUrl} alt={candidate.name} className="w-full aspect-square object-cover rounded mb-4" />
                                        ) : (
                                            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center text-4xl">
                                                👤
                                            </div>
                                        )}
                                        <h3 className="font-bold text-xl mb-2">{candidate.name}</h3>

                                        {contractState === "Started" && (
                                            <button
                                                onClick={() => handleVote(candidate.id)}
                                                className="mt-2 w-full px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                                            >
                                                Vote
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default VotingBooth;
