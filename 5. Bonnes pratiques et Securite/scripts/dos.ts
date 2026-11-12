import { network } from "hardhat";

const { ethers } = await network.create({
  network: "hardhatOp",
});

const auction = await ethers.deployContract("Auction")

const [owner, user1, user2, user3, user4, user5, user6] = await ethers.getSigners()

const range = 1000000000000000000000n
let value = range;

await auction.connect(user1).getFunction("bid")({value: value})
console.log("Auction balance after user1 bid:", await ethers.provider.getBalance(auction))
console.log("user1 balance after bid:", await ethers.provider.getBalance(user1))

value += range;
await auction.connect(user2).getFunction("bid")({value: value})
console.log("Auction balance after user2 bid:", await ethers.provider.getBalance(auction))
console.log("user1 balance after bid:", await ethers.provider.getBalance(user1))
console.log("user2 balance after bid:", await ethers.provider.getBalance(user2))

value += range;
await auction.connect(user3).getFunction("bid")({value: value})
console.log("Auction balance after user3 bid:", await ethers.provider.getBalance(auction))
console.log("user1 balance after bid:", await ethers.provider.getBalance(user1))
console.log("user2 balance after bid:", await ethers.provider.getBalance(user2))
console.log("user3 balance after bid:", await ethers.provider.getBalance(user3))

value += range;
const dos = await ethers.deployContract("Dos", [auction])
await dos.connect(user4).getFunction("bid")({value: value})
console.log("Auction balance after user4 bid:", await ethers.provider.getBalance(auction))
console.log("user1 balance after bid:", await ethers.provider.getBalance(user1))
console.log("user2 balance after bid:", await ethers.provider.getBalance(user2))
console.log("user3 balance after bid:", await ethers.provider.getBalance(user3))
console.log("user4 balance after bid:", await ethers.provider.getBalance(user4))

value += range;
await auction.connect(user5).getFunction("bid")({value: value})
console.log("Auction balance after user5 bid:", await ethers.provider.getBalance(auction))
console.log("user1 balance after bid:", await ethers.provider.getBalance(user1))
console.log("user2 balance after bid:", await ethers.provider.getBalance(user2))
console.log("user3 balance after bid:", await ethers.provider.getBalance(user3))
console.log("user4 balance after bid:", await ethers.provider.getBalance(user4))
console.log("user5 balance after bid:", await ethers.provider.getBalance(user5))

value += range;
await auction.connect(user6).getFunction("bid")({value: value})
console.log("Auction balance after user6 bid:", await ethers.provider.getBalance(auction))
console.log("user1 balance after bid:", await ethers.provider.getBalance(user1))
console.log("user2 balance after bid:", await ethers.provider.getBalance(user2))
console.log("user3 balance after bid:", await ethers.provider.getBalance(user3))
console.log("user4 balance after bid:", await ethers.provider.getBalance(user4))
console.log("user5 balance after bid:", await ethers.provider.getBalance(user5))
console.log("user6 balance after bid:", await ethers.provider.getBalance(user6))

await auction.connect(user1).getFunction("withdraw")()
console.log("user1 balance after withdraw:", await ethers.provider.getBalance(user1))
await auction.connect(user2).getFunction("withdraw")()
console.log("user2 balance after withdraw:", await ethers.provider.getBalance(user2))
await auction.connect(user3).getFunction("withdraw")()
console.log("user3 balance after withdraw:", await ethers.provider.getBalance(user3))
try {
  await auction.connect(user4).getFunction("withdraw")()
} catch (error) {
  console.log("user4 balance after withdraw:", await ethers.provider.getBalance(user4))
}

await auction.connect(user5).getFunction("withdraw")()
console.log("user5 balance after withdraw:", await ethers.provider.getBalance(user5))

try {
  await auction.connect(user6).getFunction("withdraw")()
} catch (error) {
  console.log("user6 balance after withdraw:", await ethers.provider.getBalance(user6))
}
