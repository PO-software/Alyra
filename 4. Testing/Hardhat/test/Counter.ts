import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const helpers = require("@nomicfoundation/hardhat-network-helpers");
helpers.mine(1);

async function deployContract() {
  return await ethers.deployContract("Counter");
}

describe("Counter", function () {

  let counter: any;

  beforeEach(async function () {
    // deploy the contract before each test
    counter = await deployContract();
  });

  it("Should emit the Increment event when calling the inc() function", async function () {
    await expect(counter.inc()).to.emit(counter, "Increment").withArgs(1n);
  });

  it("Should return x = 1", async function () {
    await counter.inc()
    expect(await counter.x()).to.equal(1n);
  });

  it.only("Should return x = 1 after calling inc()", async function () {
    await counter.inc()
    const value = await ethers.provider.getStorage(counter, 0);
    expect(await counter.getX()).to.equal(value);
  });

  it.skip("Should revert when calling inc() if the value is too high", async function () {
    const counter = await deployContract();

    // increment the counter to 10
    for (let i = 0; i < 10; i++) {
      await counter.inc();
    }

    // try to increment the counter one more time (should fail)
    await expect(counter.inc()).to.be.revertedWith("too high");
  });

  it.skip("The sum of the Increment events should match the current value", async function () {
    const counter = await ethers.deployContract("Counter");
    const deploymentBlockNumber = await ethers.provider.getBlockNumber();

    // run a series of increments
    for (let i = 1; i <= 10; i++) {
      await counter.incBy(i);
    }

    const events = await counter.queryFilter(
      counter.filters.Increment(),
      deploymentBlockNumber,
      "latest",
    );

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    expect(await counter.x()).to.equal(total);
  });
});
