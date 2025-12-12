const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const Factory = await hre.ethers.getContractFactory("ElectionFactory");
    const factory = await Factory.deploy();

    await factory.waitForDeployment();
    const address = await factory.getAddress();
    console.log("ElectionFactory deployed to:", address);

    fs.writeFileSync("address.txt", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
