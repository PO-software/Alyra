import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const deployContract = async () => {
  return await ethers.deployContract("Token");
}

describe("ERC20", () => {

  describe("Deployment and initial states", () => {

    let token: any

    beforeEach(async () => {
      token = await deployContract()
    })

    it("Should have the correct name and symbol", async () => {
      expect(await token.name()).to.equal("MyToken")
      expect(await token.symbol()).to.equal("MTK")
    })

    it("Should have the correct decimals", async () => {
      expect(await token.decimals()).to.equal(18n)
    })

    it("Should have the correct initial supply", async () => {
      const initialSupply = await token.totalSupply()
      expect(initialSupply).to.equal(0n)
    })

  })

  describe("Approvals", () => {

    let _token: any
    let _owner: any
    let _spender: any
    const _amount = 100n

    beforeEach(async () => {
      _token = await deployContract()
      const [owner, spender] = await ethers.getSigners()
      _owner = owner
      _spender = spender
    })

    it("Should approve the correct amount for a spender", async () => {
      
      await _token.approve(_spender.address, _amount)
      const allowance = await _token.allowance(_owner.address, _spender.address)

      expect(allowance).to.equal(_amount)
    })

    it ("Should emit an Approval event on approval", async () => {

      await expect(_token.approve(_spender.address, _amount))
        .to.emit(_token, "Approval")
        .withArgs(_owner.address, _spender.address, _amount)
    })

    it ("Should not allow approval for the zero address", async () => {

      await expect(_token.approve(ethers.ZeroAddress, _amount))
        .to.be.revertedWithCustomError(_token, "ERC20InvalidSpender")
    })

  })

  describe("Transfers", () => {})

  describe("Transfer From", () => {})

  describe("Mint and Burn", () => {})

  describe("Getters", () => {

  })

})
