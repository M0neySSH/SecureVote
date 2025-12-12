// Shared in-memory storage
const elections = []; // { id, title, address, candidates: [], state: 'Created' }
const voters = []; // { email, passkey, walletAddress, electionId }
const admins = [];
const users = []; // { id, username, currentChallenge }
const authenticators = []; // { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp, transports, userId }

module.exports = { elections, voters, admins, users, authenticators };
