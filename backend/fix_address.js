const { ethers } = require('ethers');
const addr = "0x21dF544947ba3E8b3c322561399E88B52Dc8b282";
try {
    console.log("Checksummed:", ethers.getAddress(addr));
} catch (e) {
    console.log("Lowercased:", addr.toLowerCase());
}
