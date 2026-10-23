import { network } from "hardhat";

const { ethers } = await network.create({
  network: "sepolia",
  chainType: "l1",
});

console.log(await ethers.provider.getStorage("0x96884AD36c89DAc00a4dd63060D238C723a0ab3B", 0))

// console.log("Sending transaction using the OP chain type");

// const [sender] = await ethers.getSigners();

// console.log("Sending 1 wei from", sender.address, "to itself");

// console.log("Sending L2 transaction");
// const tx = await sender.sendTransaction({
//   to: sender.address,
//   value: 1n,
// });

// await tx.wait();

// console.log("Transaction sent successfully");
