import React from 'react';

function Guide() {
    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600 dark:text-indigo-400">User Guide</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Admin Guide */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">👨‍💼 For Admins</h2>
                    <ol className="list-decimal pl-5 space-y-3">
                        <li>
                            <strong>Connect Wallet:</strong> Login with your MetaMask wallet.
                        </li>
                        <li>
                            <strong>Create Election:</strong> Give your election a title and create it on the blockchain.
                        </li>
                        <li>
                            <strong>Register Voters:</strong> Enter voter emails. The system will generate a unique <strong>Passkey</strong> for them.
                            <p className="text-sm text-red-500 mt-1">⚠️ Send this Passkey to the voter immediately. It is their only way to vote.</p>
                        </li>
                        <li>
                            <strong>Set Merkle Root:</strong> Once all voters are registered, click "Set Merkle Root" to lock the voter list on the blockchain.
                        </li>
                        <li>
                            <strong>Start Election:</strong> Click "Start Election" to open the polls.
                        </li>
                    </ol>
                </div>

                {/* Voter Guide */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">🗳️ For Voters</h2>
                    <ol className="list-decimal pl-5 space-y-3">
                        <li>
                            <strong>Get Passkey:</strong> You will receive a Passkey (Private Key) from the Admin. Keep it safe!
                        </li>
                        <li>
                            <strong>Go to Voting Booth:</strong> Navigate to the "Vote" page.
                        </li>
                        <li>
                            <strong>Login:</strong> Paste your Passkey to log in.
                        </li>
                        <li>
                            <strong>Vote:</strong> Select an active election. Enter a <strong>Secret Phrase</strong> (this is used to verify your vote later without revealing who you voted for).
                        </li>
                        <li>
                            <strong>Cast Vote:</strong> Click "Vote". Wait for the confirmation.
                        </li>
                        <li>
                            <strong>Save Receipt:</strong> Save the <strong>Transaction Hash</strong> shown after voting.
                        </li>
                    </ol>
                </div>
            </div>

            {/* Verification Guide */}
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded shadow">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">✅ Verification</h2>
                <p className="mb-4">Anyone can verify that a vote was counted correctly without knowing who voted for whom.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Go to the <strong>Verify</strong> page.</li>
                    <li>Enter your <strong>Passkey</strong> or <strong>Wallet Address</strong> to check if your vote was counted.</li>
                    <li>Enter a <strong>Transaction Hash</strong> to verify the proof of vote on the blockchain.</li>
                </ul>
            </div>
        </div>
    );
}

export default Guide;
