import { expect } from "chai"
import { network } from "hardhat"

const { ethers } = await network.create()

const setUpSmartContract = async () => {

  const contract = await ethers.deployContract("Voting")
  const [owner, user1, user2, user3, user4] = await ethers.getSigners()

  return { contract, owner, user1, user2, user3, user4 }
}

const setUpToProposalState = async () => {
  const { contract, owner, user1, user2, user3, user4 } = await setUpSmartContract()
  await contract.addVoter(user1.address)
  await contract.addVoter(user2.address)
  await contract.addVoter(user3.address)
  await contract.startProposalsRegistering()
  return { contract, owner, user1, user2, user3, user4 }
}

const setUpToVotingState = async () => {
  const { contract, owner, user1, user2, user3, user4 } = await setUpToProposalState()
  await contract.connect(user1).addProposal("Proposal 1")
  await contract.connect(user2).addProposal("Proposal 2")
  await contract.connect(user3).addProposal("Proposal 3")
  await contract.endProposalsRegistering()
  await contract.startVotingSession()
  return { contract, owner, user1, user2, user3, user4 }
}

const setUpToEndVotingState = async () => {
  const { contract, owner, user1, user2, user3, user4 } = await setUpToVotingState()
  await contract.connect(user1).setVote(1)
  await contract.connect(user2).setVote(2)
  await contract.connect(user3).setVote(1)
  await contract.endVotingSession()
  return { contract, owner, user1, user2, user3, user4 }
}

describe("Voting contract", () => {

  describe("Deployment and initial state", () => {

    let contract: any, owner: any

    beforeEach(async () => {
      ({ contract, owner } = await setUpSmartContract())
    })

    it("Should set the right owner", async () => {
      expect(await contract.owner()).to.equal(owner.address)
    })

    it("Should have initial workflow status set to RegisteringVoters", async () => {
      expect(await contract.workflowStatus()).to.equal(0)
    })

    it("Should have initial winning proposal id set to 0", async () => {
      expect(await contract.winningProposalID()).to.equal(0)
    })
  })

  describe("Voter registration", () => {

    let contract: any, owner: any, user1: any, user2: any

    beforeEach(async () => {
      ({ contract, owner, user1, user2 } = await setUpSmartContract())
    })

    it("Should allow the owner to register a voter", async () => {
      await expect(contract.addVoter(user1.address)).to.emit(contract, "VoterRegistered").withArgs(user1.address)
    })

    it("Should not allow a non-owner to register a voter", async () => {
      await expect(contract.connect(user1).addVoter(user2.address)).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
    })

    it("Should not allow registering the same voter twice", async () => {
      await contract.addVoter(user1.address)
      await expect(contract.addVoter(user1.address)).to.be.revertedWith("Already registered")
    })

    it("Should not allow registering a voter when the workflow status is not RegisteringVoters", async () => {
      await contract.startProposalsRegistering()
      await expect(contract.addVoter(user1.address)).to.be.revertedWith("Voters registration is not open yet")
    })
  })

  describe("Proposal registration", () => {

    let contract: any, owner: any, user1: any, user2: any, user3: any, user4: any

    beforeEach(async () => {
      ({ contract, owner, user1, user2, user3, user4 } = await setUpToProposalState())
    })

    it("Should allow a registered voter to submit a proposal", async () => {
      await expect(contract.connect(user1).addProposal("Proposal 1")).to.emit(contract, "ProposalRegistered").withArgs(1)
    })

    it("Should not allow a non-registered voter to submit a proposal", async () => {
      await expect(contract.connect(user4).addProposal("Proposal 2")).to.be.revertedWith("You're not a voter")
    })

    it("Should not allow submitting an empty proposal", async () => {
      await expect(contract.connect(user1).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer")
    })

    it("Should not allow submitting a proposal when the workflow status is not ProposalsRegistrationStarted", async () => {
      await contract.endProposalsRegistering()
      await expect(contract.connect(user1).addProposal("Proposal 3")).to.be.revertedWith("Proposals are not allowed yet")
    })
  })

  describe("Voting session", () => {

    let contract: any, owner: any, user1: any, user2: any, user3: any, user4: any

    beforeEach(async () => {
      ({ contract, owner, user1, user2, user3, user4 } = await setUpToVotingState())
    })

    it("Should allow a registered voter to vote for a proposal", async () => {
      await expect(contract.connect(user1).setVote(1)).to.emit(contract, "Voted").withArgs(user1.address, 1)
    })

    it("Should not allow a non-registered voter to vote", async () => {
      await expect(contract.connect(user4).setVote(1)).to.be.revertedWith("You're not a voter")
    })

    it("Should not allow voting for a non-existent proposal", async () => {
      await expect(contract.connect(user1).setVote(4)).to.be.revertedWith("Proposal not found")
    })

    it("Should not allow voting when the workflow status is not VotingSessionStarted", async () => {
      await contract.endVotingSession()
      await expect(contract.connect(user1).setVote(1)).to.be.revertedWith("Voting session havent started yet")
    })

    it("Should not allow a voter to vote twice", async () => {
      await contract.connect(user1).setVote(1)
      await expect(contract.connect(user1).setVote(2)).to.be.revertedWith("You have already voted")
    })
  })

  describe("Vote tallying", () => {

    let contract: any, owner: any, user1: any

    beforeEach(async () => {
      ({ contract, owner, user1 } = await setUpToEndVotingState())
    })

    it("Should allow the owner to tally votes and determine the winning proposal", async () => {
      await expect(contract.tallyVotes()).to.emit(contract, "WorkflowStatusChange").withArgs(4, 5)
      expect(await contract.winningProposalID()).to.equal(1)
    })

    it("Should not allow a non-owner to tally votes", async () => {
      await expect(contract.connect(user1).tallyVotes()).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
    })

    it("Should not allow tallying votes when the workflow status is not VotingSessionEnded", async () => {
      await contract.tallyVotes()
      await expect(contract.tallyVotes()).to.be.revertedWith("Current status is not voting session ended")
    })
  })

  describe("Workflow status transitions", () => {

    let contract: any

    beforeEach(async () => {
      ({ contract } = await setUpSmartContract())
    })

    it("Should transition from RegisteringVoters to ProposalsRegistrationStarted", async () => {
      await expect(contract.startProposalsRegistering()).to.emit(contract, "WorkflowStatusChange").withArgs(0, 1)
    })

    it("Should not allow starting proposal registration when the workflow status is not RegisteringVoters", async () => {
      await contract.startProposalsRegistering()
      await expect(contract.startProposalsRegistering()).to.be.revertedWith("Registering proposals cant be started now")
    })

    it("Should transition from ProposalsRegistrationStarted to ProposalsRegistrationEnded", async () => {
      await contract.startProposalsRegistering()
      await expect(contract.endProposalsRegistering()).to.emit(contract, "WorkflowStatusChange").withArgs(1, 2)
    })

    it("Should not allow ending proposal registration when the workflow status is not ProposalsRegistrationStarted", async () => {
      await expect(contract.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet")
    })

    it("Should transition from ProposalsRegistrationEnded to VotingSessionStarted", async () => {
      await contract.startProposalsRegistering()
      await contract.endProposalsRegistering()
      await expect(contract.startVotingSession()).to.emit(contract, "WorkflowStatusChange").withArgs(2, 3)
    })

    it("Should not allow starting voting session when the workflow status is not ProposalsRegistrationEnded", async () => {
      await expect(contract.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished")
    })

    it("Should transition from VotingSessionStarted to VotingSessionEnded", async () => {
      await contract.startProposalsRegistering()
      await contract.endProposalsRegistering()
      await contract.startVotingSession()
      await expect(contract.endVotingSession()).to.emit(contract, "WorkflowStatusChange").withArgs(3, 4)
    })

    it("Should not allow ending voting session when the workflow status is not VotingSessionStarted", async () => {
      await expect(contract.endVotingSession()).to.be.revertedWith("Voting session havent started yet")
    })

    it("Should transition from VotingSessionEnded to VotesTallied", async () => {
      await contract.startProposalsRegistering()
      await contract.endProposalsRegistering()
      await contract.startVotingSession()
      await contract.endVotingSession()
      await expect(contract.tallyVotes()).to.emit(contract, "WorkflowStatusChange").withArgs(4, 5)
    })

    it("Should not allow tallying votes when the workflow status is not VotingSessionEnded", async () => {
      await expect(contract.tallyVotes()).to.be.revertedWith("Current status is not voting session ended")
    })
  })

  describe("Getters", () => {

    let contract: any, owner: any, user1: any, user2: any, user3: any, user4: any

    beforeEach(async () => {
      ({ contract, owner, user1, user2, user3, user4 } = await setUpToEndVotingState())
      await contract.tallyVotes()
    })

    it ("Sould return the correct winning proposal id = 1", async () => {
      expect(await contract.winningProposalID()).to.equal(1)
    })

    it("Should return the correct voter information (isRegistered, hasVoted, votedProposalId = 2)", async () => {
      const voter = await contract.connect(user1).getVoter(user2.address)
      expect(voter.isRegistered).to.be.true
      expect(voter.hasVoted).to.be.true
      expect(voter.votedProposalId).to.equal(2)
    })

    it("Should return the correct proposal information (description = Proposal 1, voteCount = 2)", async () => {
      const proposal = await contract.connect(user1).getOneProposal(1)
      expect(proposal.description).to.equal("Proposal 1")
      expect(proposal.voteCount).to.equal(2)
    })

    it ("Should not allow getting voter information for a non-registered voter", async () => {
      await expect(contract.connect(user4).getVoter(user1.address)).to.be.revertedWith("You're not a voter")
    })

    it ("Should not allow getting proposal information for a non-existent proposal", async () => {
      await expect(contract.connect(user1).getOneProposal(4)).to.be.revertedWithPanic(0x32)
    })
  })

})
