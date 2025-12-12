const ethers = require('ethers');

async function checkBalance() {
    try {
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

        // The address you were using before
        const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

        const balance = await provider.getBalance(address);
        const eth = ethers.formatEther(balance);

        console.log("--- Wallet Balance Check ---");
        console.log("Address:", address);
        console.log("Balance:", eth, "ETH");

        if (parseFloat(eth) > 0) {
            console.log("\n✅ You HAVE funds on the blockchain.");
            console.log("👉 If MetaMask shows 0, you need to 'Reset Account' in MetaMask settings.");
        } else {
            console.log("\n❌ You have 0 ETH. You need to transfer funds.");
        }

    } catch (err) {
        console.error("Error connecting to local network:", err.message);
    }
}

checkBalance();
