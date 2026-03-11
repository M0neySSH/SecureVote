# Blockchain-Based Online Voting System

A secure, transparent, and decentralized voting application built on the Ethereum blockchain. This project ensures election integrity using smart contracts and Merkle tree verification.

![Project Banner](path/to/your/banner-image.png)

## 🌟 Features

*   **Decentralized Voting**: All votes are recorded on the Ethereum blockchain, ensuring they are immutable and transparent.
*   **Secure Authentication**: Uses Merkle Proofs for voter whitelisting and WebAuthn for secure device access.
*   **Real-Time Analytics**: Live visualization of election results using interactive Bar and Pie charts.
*   **Admin Dashboard**: comprehensive tools for election commissioners to create elections, add candidates, and manage timelines.
*   **Voter Privacy**: Ensures one-person-one-vote while maintaining voter anonymity.
*   **Vote Verification**: Voters can verify their vote was counted using a unique transaction hash/QR code.

## 🛠️ Tech Stack

*   **Blockchain**: Solidity (Smart Contracts), Hardhat
*   **Frontend**: React.js, Vite, Tailwind CSS
*   **Interaction**: Ethers.js
*   **Visualization**: Recharts
*   **Security**: OpenZeppelin (MerkleProof)

## 📸 Screenshots

<!-- You can upload images to a 'screenshots' folder and link them here -->

### Voting Booth
![Voting Booth](path/to/voting-booth.png)

### Real-time Results
![Results](path/to/results.png)

### Admin Dashboard
![Admin Dashboard](path/to/admin.png)

## 🚀 Getting Started

### Prerequisites

*   Node.js (v14+)
*   MetaMask Wallet Extension

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Manisbisht/Online-Voting-through-blockchain.git
    cd voting2.0
    ```

2.  **Install Dependencies**
    ```bash
    # Install root/backend dependencies
    npm install

    # Install frontend dependencies
    cd frontend
    npm install
    ```

3.  **Start Local Blockchain**
    ```bash
    # Open a new terminal
    cd contracts
    npx hardhat node
    ```

4.  **Deploy Smart Contract**
    ```bash
    # In 'contracts' folder
    npx hardhat run scripts/deploy.js --network localhost
    ```

5.  **Run the Application**
    ```bash
    # In 'frontend' folder
    npm run dev
    ```
