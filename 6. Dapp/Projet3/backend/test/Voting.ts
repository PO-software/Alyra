import { expect } from "chai"
import { network } from "hardhat"

const { ethers, networkHelpers } = await network.create()
const { loadFixture } = networkHelpers

// Mirrors the Voting.WorkflowStatus enum
const Status = {
  RegisteringVoters: 0n,
  ProposalsRegistrationStarted: 1n,
  ProposalsRegistrationEnded: 2n,
  VotingSessionStarted: 3n,
  VotingSessionEnded: 4n,
  VotesTallied: 5n,
} as const
type StatusName = keyof typeof Status
const STATUSES = Object.keys(Status) as StatusName[]
const statusesOtherThan = (allowed: StatusName) => STATUSES.filter((s) => s !== allowed)

const NOT_A_VOTER = "You're not a voter"
const PANIC_ARRAY_OUT_OF_BOUNDS = 0x32
const MAX_PROPOSALS = 1000n // GENESIS included, so voters can submit 999
const PROPOSALS_LIMIT_REACHED = "Le nombre de propositions est limite a 1000"

// ::::::::::::: FIXTURES ::::::::::::: //
// Each fixture builds on the previous one. loadFixture snapshots the result,
// so every test starts from a clean copy of the state without redeploying.

async function deployFixture() {
  const [owner, voter1, voter2, voter3, outsider] = await ethers.getSigners()
  const voting = await ethers.deployContract("Voting")
  return { voting, owner, voter1, voter2, voter3, outsider }
}
type Context = Awaited<ReturnType<typeof deployFixture>>

// RegisteringVoters, with voter1..voter3 registered
async function votersRegisteredFixture() {
  const ctx = await deployFixture()
  for (const voter of [ctx.voter1, ctx.voter2, ctx.voter3]) {
    await ctx.voting.addVoter(voter.address)
  }
  return ctx
}

// ProposalsRegistrationStarted: only GENESIS (id 0) exists
async function proposalsStartedFixture() {
  const ctx = await votersRegisteredFixture()
  await ctx.voting.startProposalsRegistering()
  return ctx
}

// ProposalsRegistrationStarted with one slot left: GENESIS + 998 proposals (length 999)
async function oneProposalSlotLeftFixture() {
  const ctx = await proposalsStartedFixture()
  for (let id = 1n; id < MAX_PROPOSALS - 1n; id++) {
    await ctx.voting.connect(ctx.voter1).addProposal(`Proposal ${id}`)
  }
  return ctx
}

// ProposalsRegistrationEnded: GENESIS + "Proposal 1".."Proposal 3" (ids 1..3)
async function proposalsEndedFixture() {
  const ctx = await proposalsStartedFixture()
  await ctx.voting.connect(ctx.voter1).addProposal("Proposal 1")
  await ctx.voting.connect(ctx.voter2).addProposal("Proposal 2")
  await ctx.voting.connect(ctx.voter3).addProposal("Proposal 3")
  await ctx.voting.endProposalsRegistering()
  return ctx
}

// VotingSessionStarted: nobody has voted yet
async function votingStartedFixture() {
  const ctx = await proposalsEndedFixture()
  await ctx.voting.startVotingSession()
  return ctx
}

// VotingSessionEnded: proposal 1 has 2 votes (voter1, voter3), proposal 2 has 1 (voter2)
async function votingEndedFixture() {
  const ctx = await votingStartedFixture()
  await ctx.voting.connect(ctx.voter1).setVote(1)
  await ctx.voting.connect(ctx.voter2).setVote(2)
  await ctx.voting.connect(ctx.voter3).setVote(1)
  await ctx.voting.endVotingSession()
  return ctx
}

// VotesTallied: proposal 1 won
async function talliedFixture() {
  const ctx = await votingEndedFixture()
  await ctx.voting.tallyVotes()
  return ctx
}

// One fixture per status, to check every phase guard against every wrong status
const fixtureAt: Record<StatusName, () => Promise<Context>> = {
  RegisteringVoters: votersRegisteredFixture,
  ProposalsRegistrationStarted: proposalsStartedFixture,
  ProposalsRegistrationEnded: proposalsEndedFixture,
  VotingSessionStarted: votingStartedFixture,
  VotingSessionEnded: votingEndedFixture,
  VotesTallied: talliedFixture,
}

async function closeAndTally({ voting }: Context) {
  await voting.endVotingSession()
  await voting.tallyVotes()
  return voting.winningProposalID()
}

// ::::::::::::: TESTS ::::::::::::: //

describe("Voting", () => {

  describe("Deployment", () => {

    it("sets the deployer as owner", async () => {
      const { voting, owner } = await loadFixture(deployFixture)
      expect(await voting.owner()).to.equal(owner.address)
    })

    it("starts in RegisteringVoters", async () => {
      const { voting } = await loadFixture(deployFixture)
      expect(await voting.workflowStatus()).to.equal(Status.RegisteringVoters)
    })

    it("starts with winningProposalID = 0", async () => {
      const { voting } = await loadFixture(deployFixture)
      expect(await voting.winningProposalID()).to.equal(0n)
    })

    it("has no proposals before proposal registration starts", async () => {
      const { voting, voter1 } = await loadFixture(votersRegisteredFixture)
      await expect(voting.connect(voter1).getOneProposal(0)).to.be.revertedWithPanic(PANIC_ARRAY_OUT_OF_BOUNDS)
    })
  })

  describe("addVoter", () => {

    it("emits VoterRegistered", async () => {
      const { voting, voter1 } = await loadFixture(deployFixture)
      await expect(voting.addVoter(voter1.address)).to.emit(voting, "VoterRegistered").withArgs(voter1.address)
    })

    it("stores the voter as registered, not yet voted", async () => {
      const { voting, voter1 } = await loadFixture(deployFixture)
      await voting.addVoter(voter1.address)

      const voter = await voting.connect(voter1).getVoter(voter1.address)
      expect(voter.isRegistered).to.equal(true)
      expect(voter.hasVoted).to.equal(false)
      expect(voter.votedProposalId).to.equal(0n)
    })

    it("reverts when the caller is not the owner", async () => {
      const { voting, voter1, outsider } = await loadFixture(votersRegisteredFixture)
      await expect(voting.connect(voter1).addVoter(outsider.address))
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address)
    })

    it("reverts when the voter is already registered", async () => {
      const { voting, voter1 } = await loadFixture(votersRegisteredFixture)
      await expect(voting.addVoter(voter1.address)).to.be.revertedWith("Already registered")
    })

    describe("reverts outside RegisteringVoters", () => {
      for (const status of statusesOtherThan("RegisteringVoters")) {
        it(`during ${status}`, async () => {
          const { voting, outsider } = await loadFixture(fixtureAt[status])
          await expect(voting.addVoter(outsider.address)).to.be.revertedWith("Voters registration is not open yet")
        })
      }
    })
  })

  describe("addProposal", () => {

    it("reserves id 0 for the GENESIS proposal", async () => {
      const { voting, voter1 } = await loadFixture(proposalsStartedFixture)
      const genesis = await voting.connect(voter1).getOneProposal(0)
      expect(genesis.description).to.equal("GENESIS")
      expect(genesis.voteCount).to.equal(0n)
    })

    it("emits ProposalRegistered with sequential ids starting at 1", async () => {
      const { voting, voter1, voter2 } = await loadFixture(proposalsStartedFixture)
      await expect(voting.connect(voter1).addProposal("First")).to.emit(voting, "ProposalRegistered").withArgs(1n)
      await expect(voting.connect(voter2).addProposal("Second")).to.emit(voting, "ProposalRegistered").withArgs(2n)
    })

    it("stores the description with zero votes", async () => {
      const { voting, voter1 } = await loadFixture(proposalsStartedFixture)
      await voting.connect(voter1).addProposal("Build a park")

      const proposal = await voting.connect(voter1).getOneProposal(1)
      expect(proposal.description).to.equal("Build a park")
      expect(proposal.voteCount).to.equal(0n)
    })

    it("lets one voter submit several proposals", async () => {
      const { voting, voter1 } = await loadFixture(proposalsStartedFixture)
      await voting.connect(voter1).addProposal("First")
      await expect(voting.connect(voter1).addProposal("Second")).to.emit(voting, "ProposalRegistered").withArgs(2n)
    })

    it("accepts duplicate descriptions (no uniqueness check)", async () => {
      const { voting, voter1, voter2 } = await loadFixture(proposalsStartedFixture)
      await voting.connect(voter1).addProposal("Same idea")
      await expect(voting.connect(voter2).addProposal("Same idea")).to.emit(voting, "ProposalRegistered").withArgs(2n)
    })

    it("reverts on an empty description", async () => {
      const { voting, voter1 } = await loadFixture(proposalsStartedFixture)
      await expect(voting.connect(voter1).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer")
    })

    it("reverts when the caller is not a voter", async () => {
      const { voting, outsider } = await loadFixture(proposalsStartedFixture)
      await expect(voting.connect(outsider).addProposal("Proposal")).to.be.revertedWith(NOT_A_VOTER)
    })

    it("reverts for the owner, who is not a voter unless registered", async () => {
      const { voting } = await loadFixture(proposalsStartedFixture)
      await expect(voting.addProposal("Proposal")).to.be.revertedWith(NOT_A_VOTER)
    })

    describe("reverts outside ProposalsRegistrationStarted", () => {
      for (const status of statusesOtherThan("ProposalsRegistrationStarted")) {
        it(`during ${status}`, async () => {
          const { voting, voter1 } = await loadFixture(fixtureAt[status])
          await expect(voting.connect(voter1).addProposal("Late proposal")).to.be.revertedWith("Proposals are not allowed yet")
        })
      }
    })

    describe("limit of 1000 proposals, GENESIS included", () => {

      it("accepts the proposal that fills the last slot (id 999)", async () => {
        const { voting, voter2 } = await loadFixture(oneProposalSlotLeftFixture)
        await expect(voting.connect(voter2).addProposal("Last one"))
          .to.emit(voting, "ProposalRegistered")
          .withArgs(MAX_PROPOSALS - 1n)
      })

      it("reverts once 1000 proposals exist", async () => {
        const { voting, voter2 } = await loadFixture(oneProposalSlotLeftFixture)
        await voting.connect(voter2).addProposal("Last one")
        await expect(voting.connect(voter2).addProposal("One too many")).to.be.revertedWith(PROPOSALS_LIMIT_REACHED)
      })

      it("still lets votes be tallied with the maximum number of proposals", async () => {
        const ctx = await loadFixture(oneProposalSlotLeftFixture)
        const { voting, voter1, voter2 } = ctx
        await voting.connect(voter2).addProposal("Last one")
        await voting.endProposalsRegistering()
        await voting.startVotingSession()
        await voting.connect(voter1).setVote(MAX_PROPOSALS - 1n)
        expect(await closeAndTally(ctx)).to.equal(MAX_PROPOSALS - 1n)
      })
    })
  })

  describe("setVote", () => {

    it("emits Voted", async () => {
      const { voting, voter1 } = await loadFixture(votingStartedFixture)
      await expect(voting.connect(voter1).setVote(2)).to.emit(voting, "Voted").withArgs(voter1.address, 2n)
    })

    it("records the vote on the voter", async () => {
      const { voting, voter1 } = await loadFixture(votingStartedFixture)
      await voting.connect(voter1).setVote(2)

      const voter = await voting.connect(voter1).getVoter(voter1.address)
      expect(voter.hasVoted).to.equal(true)
      expect(voter.votedProposalId).to.equal(2n)
    })

    it("increments the proposal's vote count", async () => {
      const { voting, voter1, voter2 } = await loadFixture(votingStartedFixture)
      await voting.connect(voter1).setVote(3)
      await voting.connect(voter2).setVote(3)

      expect((await voting.connect(voter1).getOneProposal(3)).voteCount).to.equal(2n)
    })

    it("accepts a vote for GENESIS (id 0)", async () => {
      const { voting, voter1 } = await loadFixture(votingStartedFixture)
      await expect(voting.connect(voter1).setVote(0)).to.emit(voting, "Voted").withArgs(voter1.address, 0n)
    })

    it("accepts the last proposal id", async () => {
      const { voting, voter1 } = await loadFixture(votingStartedFixture)
      await expect(voting.connect(voter1).setVote(3)).to.emit(voting, "Voted")
    })

    it("reverts for an id one past the last proposal", async () => {
      const { voting, voter1 } = await loadFixture(votingStartedFixture)
      await expect(voting.connect(voter1).setVote(4)).to.be.revertedWith("Proposal not found")
    })

    it("reverts when the voter has already voted", async () => {
      const { voting, voter1 } = await loadFixture(votingStartedFixture)
      await voting.connect(voter1).setVote(1)
      await expect(voting.connect(voter1).setVote(2)).to.be.revertedWith("You have already voted")
    })

    it("reverts when the caller is not a voter", async () => {
      const { voting, outsider } = await loadFixture(votingStartedFixture)
      await expect(voting.connect(outsider).setVote(1)).to.be.revertedWith(NOT_A_VOTER)
    })

    it("reverts for the owner, who is not a voter unless registered", async () => {
      const { voting } = await loadFixture(votingStartedFixture)
      await expect(voting.setVote(1)).to.be.revertedWith(NOT_A_VOTER)
    })

    describe("reverts outside VotingSessionStarted", () => {
      for (const status of statusesOtherThan("VotingSessionStarted")) {
        it(`during ${status}`, async () => {
          const { voting, voter1 } = await loadFixture(fixtureAt[status])
          await expect(voting.connect(voter1).setVote(1)).to.be.revertedWith("Voting session havent started yet")
        })
      }
    })
  })

  describe("Workflow transitions", () => {

    const transitions = [
      { fn: "startProposalsRegistering", from: "RegisteringVoters", to: "ProposalsRegistrationStarted", error: "Registering proposals cant be started now" },
      { fn: "endProposalsRegistering", from: "ProposalsRegistrationStarted", to: "ProposalsRegistrationEnded", error: "Registering proposals havent started yet" },
      { fn: "startVotingSession", from: "ProposalsRegistrationEnded", to: "VotingSessionStarted", error: "Registering proposals phase is not finished" },
      { fn: "endVotingSession", from: "VotingSessionStarted", to: "VotingSessionEnded", error: "Voting session havent started yet" },
      { fn: "tallyVotes", from: "VotingSessionEnded", to: "VotesTallied", error: "Current status is not voting session ended" },
    ] as const

    for (const { fn, from, to, error } of transitions) {
      describe(fn, () => {

        it(`moves ${from} → ${to} and emits WorkflowStatusChange`, async () => {
          const { voting } = await loadFixture(fixtureAt[from])
          await expect(voting[fn]()).to.emit(voting, "WorkflowStatusChange").withArgs(Status[from], Status[to])
          expect(await voting.workflowStatus()).to.equal(Status[to])
        })

        it("reverts when the caller is not the owner", async () => {
          const { voting, voter1 } = await loadFixture(fixtureAt[from])
          await expect(voting.connect(voter1)[fn]())
            .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
            .withArgs(voter1.address)
        })

        for (const status of statusesOtherThan(from)) {
          it(`reverts during ${status}`, async () => {
            const { voting } = await loadFixture(fixtureAt[status])
            await expect(voting[fn]()).to.be.revertedWith(error)
          })
        }
      })
    }
  })

  describe("Tally results", () => {

    it("keeps winningProposalID at 0 until votes are tallied", async () => {
      const { voting } = await loadFixture(votingEndedFixture)
      expect(await voting.winningProposalID()).to.equal(0n)
    })

    it("elects the proposal with the most votes", async () => {
      const { voting } = await loadFixture(talliedFixture)
      expect(await voting.winningProposalID()).to.equal(1n)
    })

    it("keeps the final vote count of every proposal", async () => {
      const { voting, voter1 } = await loadFixture(talliedFixture)
      const counts = await Promise.all(
        [0, 1, 2, 3].map(async (id) => (await voting.connect(voter1).getOneProposal(id)).voteCount),
      )
      expect(counts).to.deep.equal([0n, 2n, 1n, 0n])
    })

    it("elects a later proposal that overtakes earlier ones", async () => {
      const ctx = await loadFixture(votingStartedFixture)
      await ctx.voting.connect(ctx.voter1).setVote(1)
      await ctx.voting.connect(ctx.voter2).setVote(3)
      await ctx.voting.connect(ctx.voter3).setVote(3)
      expect(await closeAndTally(ctx)).to.equal(3n)
    })

    it("breaks a tie in favour of the lowest proposal id", async () => {
      const ctx = await loadFixture(votingStartedFixture)
      await ctx.voting.connect(ctx.voter1).setVote(3)
      await ctx.voting.connect(ctx.voter2).setVote(2)
      expect(await closeAndTally(ctx)).to.equal(2n)
    })

    it("elects GENESIS when nobody voted", async () => {
      const ctx = await loadFixture(votingStartedFixture)
      expect(await closeAndTally(ctx)).to.equal(0n)
    })
  })

  describe("Getters", () => {

    it("getVoter returns an empty record for an unregistered address", async () => {
      const { voting, voter1, outsider } = await loadFixture(votersRegisteredFixture)
      const voter = await voting.connect(voter1).getVoter(outsider.address)
      expect(voter.isRegistered).to.equal(false)
      expect(voter.hasVoted).to.equal(false)
      expect(voter.votedProposalId).to.equal(0n)
    })

    it("getVoter lets a voter read another voter's ballot", async () => {
      const { voting, voter1, voter2 } = await loadFixture(talliedFixture)
      const voter = await voting.connect(voter1).getVoter(voter2.address)
      expect(voter.isRegistered).to.equal(true)
      expect(voter.hasVoted).to.equal(true)
      expect(voter.votedProposalId).to.equal(2n)
    })

    it("getVoter reverts when the caller is not a voter", async () => {
      const { voting, voter1, outsider } = await loadFixture(votersRegisteredFixture)
      await expect(voting.connect(outsider).getVoter(voter1.address)).to.be.revertedWith(NOT_A_VOTER)
    })

    it("getOneProposal reverts when the caller is not a voter", async () => {
      const { voting, outsider } = await loadFixture(proposalsStartedFixture)
      await expect(voting.connect(outsider).getOneProposal(0)).to.be.revertedWith(NOT_A_VOTER)
    })

    it("getOneProposal panics for an id past the last proposal", async () => {
      const { voting, voter1 } = await loadFixture(talliedFixture)
      await expect(voting.connect(voter1).getOneProposal(4)).to.be.revertedWithPanic(PANIC_ARRAY_OUT_OF_BOUNDS)
    })
  })
})
