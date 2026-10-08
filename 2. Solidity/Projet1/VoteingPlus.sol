// SPDX-License-Identifier: GPL-3.0

pragma solidity = 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingPlus is Ownable {

    /* TYPES */

    struct Vote {
        address _owner;
        WorkflowStatus _status;
        string _description;
        bool _hasVoters;
        bool _hasVotes;
        mapping (address => Voter) _voters;
        Proposal[] _proposals;
        uint[] _winningProposalIds;
    }

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

    Vote[] private _votes;
    mapping (address => bool) private _voteOwners;

    /* CONSTRUCTOR */
    constructor() Ownable(msg.sender) {

    }

    /* EVENTS */

    event VoteCreated(uint id, address owner);
    event VoterRegistered(uint id, address voterAddress);
    event WorkflowStatusChange(uint id, WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint id, uint proposalId);
    event Voted (uint id, address voter, uint proposalId);

        /* MODIFIERS */

    modifier voteExists(uint voteId) {
        require(_votes.length > voteId, Errors.VOTE_ID_NOT_FOUND);
        _;
    }

    modifier isVoteOwner(uint voteId) {
        require(_votes[voteId]._owner == msg.sender, Errors.NOT_AUTHORIZED);
        _;
    }

    modifier isRegistered(uint voteId) {
        require(_votes[voteId]._voters[msg.sender].isRegistered, Errors.USER_NOT_REGISTERED);
        _;
    }

    /* EXTERNAL FUNCTIONS */

    //contract owner should allow vote owners
    function registerVoteOwner(address address_) external onlyOwner {
        _voteOwners[address_] = true;
    }

    //vote owners should create a vote
    function createVote(string calldata desription) external {
        require(_voteOwners[msg.sender], Errors.NOT_AUTHORIZED);

        Vote storage vote = _votes.push();
        vote._owner = msg.sender;
        vote._description = desription;

        emit VoteCreated(_votes.length - 1, msg.sender);
    }

    //owner could trigger next workflow step
    //and final step automatically resolves vote counting
    function nextStatus(uint voteId) external voteExists(voteId) isVoteOwner(voteId) {
        Vote storage vote = _votes[voteId];
        require(type(WorkflowStatus).max != vote._status, Errors.VOTE_ENDED);

        if (WorkflowStatus.RegisteringVoters == vote._status) {
            require(vote._hasVoters, Errors.NO_VOTERS);
        }

        if (WorkflowStatus.ProposalsRegistrationStarted == vote._status) {
            require(vote._proposals.length > 0, Errors.PROPOSAL_EMPTY);
        }

        if (WorkflowStatus.VotingSessionStarted == vote._status) {
            require(vote._hasVotes, Errors.NO_VOTES);
        }

        vote._status = WorkflowStatus(uint(vote._status) + 1);

        if (type(WorkflowStatus).max == vote._status)
            _closeVote(vote);

        emit WorkflowStatusChange(voteId, WorkflowStatus(uint(vote._status) - 1), vote._status);
    }

    //owner could register allowed voters
    function registerVoter(uint voteId, address address_) external voteExists(voteId) isVoteOwner(voteId) {
        Vote storage vote = _votes[voteId];
        require(WorkflowStatus.RegisteringVoters == vote._status, Errors.REGISTER_NOT_OPENED);
        require(!vote._voters[address_].isRegistered, Errors.USER_ALREADY_REGISTERED);

        vote._voters[address_].isRegistered = true;

        vote._hasVoters = true;

        emit VoterRegistered(voteId, address_);
    }

    //allowed users could send a proposal
    function sendProposal(uint voteId, string calldata description) external voteExists(voteId) isRegistered(voteId) {
        Vote storage vote = _votes[voteId];
        require(WorkflowStatus.ProposalsRegistrationStarted == vote._status, Errors.PROPOSAL_NOT_OPENED);

        Proposal memory proposal;
        proposal.description = description;
        vote._proposals.push(proposal);

        emit ProposalRegistered(voteId, vote._proposals.length - 1);
    }

    //allowed users could send a vote
    function sendVote(uint voteId, uint proposalId) external voteExists(voteId) isRegistered(voteId) {
        Vote storage vote = _votes[voteId];
        require(WorkflowStatus.VotingSessionStarted == vote._status, Errors.VOTE_NOT_OPENED);
        require(!vote._voters[msg.sender].hasVoted, Errors.USER_ALREADY_VOTED);
        require(proposalId < vote._proposals.length, Errors.PROPOSAL_ID_NOT_FOUND);

        vote._voters[msg.sender].hasVoted = true;
        vote._voters[msg.sender].votedProposalId = proposalId;

        vote._proposals[proposalId].voteCount++; 

        vote._hasVotes = true;

        emit Voted(voteId, msg.sender, proposalId);
    }

    /* GETTERS */

    //everyone could see proposals
    function getProposals(uint voteId) external view voteExists(voteId) returns (Proposal[] memory) {
        require(_votes[voteId]._proposals.length > 0, Errors.PROPOSAL_EMPTY);
        return _votes[voteId]._proposals;
    }

    //only allowed users could observe other user votes
    function getUserVote(uint voteId, address address_) external view voteExists(voteId) isRegistered(voteId) returns (uint) {
        require(_votes[voteId]._voters[address_].isRegistered, Errors.USER_NOT_REGISTERED);
        require(_votes[voteId]._voters[address_].hasVoted, Errors.USER_NO_VOTE);

        return _votes[voteId]._voters[address_].votedProposalId;
    }

    //everyone could see the winning proposal
    function getWinner(uint voteId) external view voteExists(voteId) returns (uint[] memory) {
        require(WorkflowStatus.VotesTallied == _votes[voteId]._status, Errors.VOTE_NOT_CLOSED);
        return _votes[voteId]._winningProposalIds;
    }

    /* PRIVATE FUNCTIONS */

    //automatically resolves the winning proposals
    //draw is allowed
    function _closeVote(Vote storage vote) private {
        assert(WorkflowStatus.VotesTallied == vote._status);
        assert(vote._proposals.length > 0);

        uint maxCount;
        for (uint i = 0; i < vote._proposals.length; i++) {

            if (vote._proposals[i].voteCount > maxCount)
                maxCount = vote._proposals[i].voteCount;
        }

        //draw: every proposal reaching maxCount wins
        for (uint i = 0; i < vote._proposals.length; i++) {
            
            if (vote._proposals[i].voteCount == maxCount)
                vote._winningProposalIds.push(i);
        }
    }  
}

library Errors {

    string constant NOT_AUTHORIZED = "Not authorized";

    string constant VOTE_ID_NOT_FOUND = "Vote ID not found";

    string constant NO_VOTERS = "No voters registered";

    string constant REGISTER_NOT_OPENED = "Registering period not opened";

    string constant PROPOSAL_NOT_OPENED = "Proposal period not opened";

    string constant PROPOSAL_EMPTY = "No proposal yet";

    string constant PROPOSAL_ID_NOT_FOUND = "Proposal ID not found";

    string constant NO_VOTES = "No votes yet";

    string constant VOTE_NOT_OPENED = "Vote period not opened yet";

    string constant VOTE_NOT_CLOSED = "Vote period not closed yet";

    string constant VOTE_ENDED = "Vote has already reached final step";

    string constant USER_NOT_REGISTERED = "User not registered";

    string constant USER_ALREADY_REGISTERED = "User already registered";

    string constant USER_NO_VOTE = "User has not voted yet";

    string constant USER_ALREADY_VOTED = "User has already voted";

}