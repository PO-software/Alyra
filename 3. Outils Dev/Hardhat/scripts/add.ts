import { network } from "hardhat";

const { ethers } = await network.create({
    network: "localhost",
});

async function main(): Promise<void> {
    console.log("Connection au contrat en cours...");

    const Counter = await ethers.getContractAt(
        "Counter",
        "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    );

    console.log(
        `Connexion faite à counter déployé à ${await Counter.getAddress()}`,
    );

    console.log(`Action en cours...`);
    const tx = await Counter.inc();
    await tx.wait();

    const count = await Counter.x();
    console.log(`Action effectuée, le nouveau count est de : ${count}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
