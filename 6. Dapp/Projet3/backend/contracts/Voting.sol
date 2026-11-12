// SPDX-License-Identifier: MIT

pragma solidity 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Voting
/// @author Alyra (correction of the "Système de vote" challenge #2), with a 1000-proposal cap
/// @notice Whitelisted vote: the owner registers voters, voters submit proposals then vote once,
///         the owner tallies the votes, and anyone can read the winning proposal.
/// @dev Workflow, one owner-only step at a time: RegisteringVoters -> ProposalsRegistrationStarted ->
///      ProposalsRegistrationEnded -> VotingSessionStarted -> VotingSessionEnded -> VotesTallied.
contract Voting is Ownable {


    /// @notice Id of the winning proposal, set by `tallyVotes` (0 until then).
    uint public winningProposalID;
    
    /// @dev A voter's record: whitelisted, has voted, and the proposal id they voted for.
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    /// @dev A proposal: its description and the number of votes it received.
    struct Proposal {
        string description;
        uint voteCount;
    }

    /// @dev The six steps of the vote, in order.
    enum  WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    /// @notice Current step of the vote.
    WorkflowStatus public workflowStatus;
    /// @dev All proposals; index 0 is GENESIS, pushed by `startProposalsRegistering`.
    Proposal[] proposalsArray;
    /// @dev Voter records by address.
    mapping (address => Voter) voters;


    /// @notice Emitted when the owner registers a voter.
    /// @param voterAddress The newly registered voter.
    event VoterRegistered(address voterAddress); 
    /// @notice Emitted on every step change.
    /// @param previousStatus The step that just ended.
    /// @param newStatus The step that starts.
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    /// @notice Emitted when a voter submits a proposal.
    /// @param proposalId Id of the new proposal (its index in the proposals array).
    event ProposalRegistered(uint proposalId);
    /// @notice Emitted when a voter votes.
    /// @param voter The voter.
    /// @param proposalId Id of the proposal they voted for.
    event Voted (address voter, uint proposalId);

    /// @notice The deployer becomes the owner, i.e. the administrator of the vote.
    constructor() Ownable(msg.sender) {    }
    
    /// @dev Reverts with "You're not a voter" unless the caller is a registered voter.
    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a voter");
        _;
    }
    
    // on peut faire un modifier pour les états

    // ::::::::::::: GETTERS ::::::::::::: //

    /// @notice Returns a voter's record. Registered voters only.
    /// @param _addr Address to look up.
    /// @return Whether the address is registered, whether it voted, and for which proposal
    ///         (an empty record for an unregistered address).
    function getVoter(address _addr) external onlyVoters view returns (Voter memory) {
        return voters[_addr];
    }
    
    /// @notice Returns one proposal. Registered voters only.
    /// @dev Reverts with panic 0x32 for an id past the last proposal.
    /// @param _id Proposal id; 0 is GENESIS.
    /// @return The proposal's description and vote count.
    function getOneProposal(uint _id) external onlyVoters view returns (Proposal memory) {
        return proposalsArray[_id];
    }

 
    // ::::::::::::: REGISTRATION ::::::::::::: // 

    /// @notice Whitelists an address as a voter. Owner only, while voters are being registered.
    /// @dev Reverts if voter registration is closed or the address is already registered.
    ///      Emits `VoterRegistered`.
    /// @param _addr Address to register.
    function addVoter(address _addr) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
        require(voters[_addr].isRegistered != true, 'Already registered');
    
        voters[_addr].isRegistered = true;
        emit VoterRegistered(_addr);
    }
 

    // ::::::::::::: PROPOSAL ::::::::::::: // 

    /// @notice Submits a proposal. Registered voters only, during proposal registration.
    /// @dev At most 1000 entries, GENESIS included, so voters can submit 999 proposals.
    ///      Duplicate descriptions are accepted. Emits `ProposalRegistered` with the new id.
    /// @param _desc Description of the proposal; must not be empty.
    function addProposal(string calldata _desc) external onlyVoters {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Proposals are not allowed yet');
        require(proposalsArray.length < 1000, 'Le nombre de propositions est limite a 1000'); // facultatif
        require(keccak256(abi.encode(_desc)) != keccak256(abi.encode("")), 'Vous ne pouvez pas ne rien proposer'); // facultatif
        // voir que desc est different des autres

        Proposal memory proposal;
        proposal.description = _desc;
        proposalsArray.push(proposal);
        // proposalsArray.push(Proposal(_desc,0));
        emit ProposalRegistered(proposalsArray.length-1);
    }

    // ::::::::::::: VOTE ::::::::::::: //

    /// @notice Votes for a proposal, once. Registered voters only, during the voting session.
    /// @dev Emits `Voted`.
    /// @param _id Id of an existing proposal; GENESIS (0) is accepted.
    function setVote( uint _id) external onlyVoters {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        require(voters[msg.sender].hasVoted != true, 'You have already voted');
        require(_id < proposalsArray.length, 'Proposal not found'); // pas obligé, et pas besoin du >0 car uint

        voters[msg.sender].votedProposalId = _id;
        voters[msg.sender].hasVoted = true;
        proposalsArray[_id].voteCount++;

        emit Voted(msg.sender, _id);
    }

    // ::::::::::::: STATE ::::::::::::: //


    /// @notice Closes voter registration and opens proposal registration. Owner only.
    /// @dev Pushes the GENESIS proposal at id 0, without a `ProposalRegistered` event.
    ///      Emits `WorkflowStatusChange`.
    function startProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Registering proposals cant be started now');
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        
        Proposal memory proposal;
        proposal.description = "GENESIS";
        proposalsArray.push(proposal);
        
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    /// @notice Closes proposal registration. Owner only.
    /// @dev Emits `WorkflowStatusChange`.
    function endProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Registering proposals havent started yet');
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /// @notice Opens the voting session. Owner only, once proposal registration is closed.
    /// @dev Emits `WorkflowStatusChange`.
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, 'Registering proposals phase is not finished');
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    /// @notice Closes the voting session. Owner only.
    /// @dev Emits `WorkflowStatusChange`.
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }


    /// @notice Counts the votes and stores the winner in `winningProposalID`. Owner only, once voting is closed.
    /// @dev Loops over every proposal (bounded by the 1000 cap). On a tie the lowest id wins (strict `>`),
    ///      so GENESIS wins if nobody voted. Emits `WorkflowStatusChange`.
   function tallyVotes() external onlyOwner {
       require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
       uint _winningProposalId;
      for (uint256 p = 0; p < proposalsArray.length; p++) {
           if (proposalsArray[p].voteCount > proposalsArray[_winningProposalId].voteCount) {
               _winningProposalId = p;
          }
       }
       winningProposalID = _winningProposalId;
       
       workflowStatus = WorkflowStatus.VotesTallied;
       emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
}