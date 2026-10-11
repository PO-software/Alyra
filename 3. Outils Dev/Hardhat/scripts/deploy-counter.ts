import { network } from "hardhat";

const { ethers } = await network.create({
    network: "localhost",
});

async function main(): Promise<void> {
    console.log("Déploiement en cours...");

    const Counter = await ethers.deployContract("Counter");

    console.log(`Contract déployé à ${await Counter.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
