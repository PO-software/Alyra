import { network } from "hardhat";

const { ethers } = await network.create({
  network: "hardhatOp",
});

const vault = await ethers.deployContract("Vault")

const [owner, user1, user2, user3, user4] = await ethers.getSigners()

await vault.connect(user1).store({value: 1000n})
console.log("Vault balance after user1 store:", await ethers.provider.getBalance(vault))
console.log("user1 balance after store:", await vault.balances(user1.address))

const reentrency = await ethers.deployContract("Reentrency", [vault, 100n], {value: 10000n})
console.log("Hack balance:", await ethers.provider.getBalance(reentrency))

console.log("Vault:", await ethers.provider.getBalance(vault))
console.log("user1 balance:", await vault.balances(user1.address))
console.log("user2 balance:", await vault.balances(user2.address))

await reentrency.redeem()

console.log("Vault balance:", await ethers.provider.getBalance(vault))
console.log("Hack balance:", await ethers.provider.getBalance(reentrency))