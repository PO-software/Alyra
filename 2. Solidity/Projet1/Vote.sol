// SPDX-License-Identifier: GPL-3.0

pragma solidity = 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Vote is Ownable {

    /* TYPES */

    struct Voter {
        bool isRegistered; 
        bool hasVoted; 
        uint votedProposalId; 
    } 

    struct Proposal { 
        string description; 
        uint voteCount;    
    }

    enum WorkflowStatus { 
        RegisteringVoters, 
        ProposalsRegistrationStarted, 
        ProposalsRegistrationEnded, 
        VotingSessionStarted, 
        VotingSessionEnded, 
        VotesTallied 
    }

    /* STATES */

    WorkflowStatus public status = WorkflowStatus.RegisteringVoters;
    mapping (address => Voter) voters;
    Proposal[] proposals;
    uint winningProposalId;

    /* CONSTRUCTORS */

    constructor() Ownable(msg.sender) {

    }

    /* EVENTS */

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

    /* MODIFIERS */

    modifier isRegistered {
        require(voters[msg.sender].isRegistered, Errors.USER_NOT_REGISTERED);
        _;
    }

    /* EXTERNAL FUNCTIONS */

    //owner could trigger next workflow step
    //and final step automatically resolves vote counting
    function nextStatus() external onlyOwner {
        require(type(WorkflowStatus).max != status, Errors.VOTE_ENDED);

        if (WorkflowStatus.ProposalsRegistrationStarted == status) {
            require(proposals.length > 0, Errors.PROPOSAL_EMPTY);
        }

        status = WorkflowStatus(uint(status) + 1);

        if (type(WorkflowStatus).max == status)
            closeVote();

        emit WorkflowStatusChange(WorkflowStatus(uint(status) - 1), status);
    }

    //owner could register allowed voters
    function register(address address_) external onlyOwner {
        require(WorkflowStatus.RegisteringVoters == status, Errors.REGISTER_NOT_OPENED);
        require(!voters[address_].isRegistered, Errors.USER_ALREADY_REGISTERED);

        Voter memory voter;
        voter.isRegistered = true;
        voters[address_] = voter;

        emit VoterRegistered(address_);
    }

    //allowed users could send a proposal
    function sendProposal(string calldata description) external isRegistered {
        require(WorkflowStatus.ProposalsRegistrationStarted == status, Errors.PROPOSAL_NOT_OPENED);

        Proposal memory proposal;
        proposal.description = description;
        proposals.push(proposal);

        emit ProposalRegistered(proposals.length - 1);
    }

    //allowed users could send a vote
    function vote(uint proposalId) external isRegistered {//everyone could see proposals
        require(WorkflowStatus.VotingSessionStarted == status, Errors.VOTE_NOT_OPENED);
        require(!voters[msg.sender].hasVoted, Errors.USER_ALREADY_VOTED);
        require(proposalId < proposals.length, Errors.PROPOSAL_ID_NOT_FOUND);

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = proposalId;

        proposals[proposalId].voteCount++; 

        emit Voted(msg.sender, proposalId);
    }

    /* GETTERS */

    //everyone could see proposals
    function getProposals() external view returns (Proposal[] memory) {
        require(proposals.length > 0, Errors.PROPOSAL_EMPTY);
        return proposals;
    }

    //only allowed users could observe other user votes
    function getUserVote(address address_) external view isRegistered returns (uint) {
        require(voters[address_].isRegistered, Errors.USER_NOT_REGISTERED);
        require(voters[address_].hasVoted, Errors.USER_NO_VOTE);

        return voters[address_].votedProposalId;
    }

    //everyone could see the winning proposal
    function getWinner() external view returns (Proposal memory) {
        require(WorkflowStatus.VotesTallied == status, Errors.VOTE_NOT_CLOSED);
        return proposals[winningProposalId];
    }

    /* PRIVATE FUNCTIONS */

    //automatically resolves the winner proposal
    function closeVote() private {
        assert(WorkflowStatus.VotesTallied == status);
        assert(proposals.length > 0);

        for (uint i = 1; i < proposals.length; i++) {
            
            //in case of a draw result, the first proposal wins
            if (proposals[i].voteCount > proposals[i - 1].voteCount)
                winningProposalId = i;
        }    
    }
}

library Errors {

    string constant REGISTER_NOT_OPENED = "Registering period not opened";

    string constant PROPOSAL_NOT_OPENED = "Proposal period not opened";

    string constant PROPOSAL_EMPTY = "No proposal yet";

    string constant PROPOSAL_ID_NOT_FOUND = "Proposal ID not found";

    string constant VOTE_NOT_OPENED = "Vote period not opened yet";

    string constant VOTE_NOT_CLOSED = "Vote period not closed yet";

    string constant VOTE_ENDED = "Vote has already reached final step";

    string constant USER_NOT_REGISTERED = "User not registered";

    string constant USER_ALREADY_REGISTERED = "User already registered";

    string constant USER_NO_VOTE = "User has not voted yet";

    string constant USER_ALREADY_VOTED = "User has already voted";

}