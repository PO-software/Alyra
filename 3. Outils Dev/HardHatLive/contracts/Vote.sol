// SPDX-License-Identifier: MIT

pragma solidity = 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Vote is Ownable {

    /* TYPES */

    struct Voter {
        bool _isRegistered; 
        bool _hasVoted; 
        uint _votedProposalId; 
    } 

    struct Proposal { 
        string _description; 
        uint _voteCount;    
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
    
    bool private _hasVoters;
    mapping (address => Voter) private _voters;
    Proposal[] private _proposals;
    bool private _hasVotes;
    uint[] private _winningProposalIds;

    /* CONSTRUCTORS */

    constructor(address address_) Ownable(msg.sender) payable {
        register(address_);
    }

    /* EVENTS */

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

    /* MODIFIERS */

    modifier isRegistered {
        require(_voters[msg.sender]._isRegistered, Errors.USER_NOT_REGISTERED);
        _;
    }

    /* EXTERNAL FUNCTIONS */

    //owner could trigger next workflow step
    //and final step automatically resolves vote counting
    function nextStatus() external onlyOwner {
        require(type(WorkflowStatus).max != status, Errors.VOTE_ENDED);

        if (WorkflowStatus.RegisteringVoters == status) {
            require(_hasVoters, Errors.NO_VOTERS);
        }

        if (WorkflowStatus.ProposalsRegistrationStarted == status) {
            require(_proposals.length > 0, Errors.PROPOSAL_EMPTY);
        }

        if (WorkflowStatus.VotingSessionStarted == status) {
            require(_hasVotes, Errors.NO_VOTES);
        }

        status = WorkflowStatus(uint(status) + 1);

        if (type(WorkflowStatus).max == status)
            _closeVote();

        emit WorkflowStatusChange(WorkflowStatus(uint(status) - 1), status);
    }

    //owner could register allowed voters
    function register(address address_) public onlyOwner {
        require(WorkflowStatus.RegisteringVoters == status, Errors.REGISTER_NOT_OPENED);
        require(!_voters[address_]._isRegistered, Errors.USER_ALREADY_REGISTERED);

        Voter memory voter;
        voter._isRegistered = true;
        _voters[address_] = voter;

        _hasVoters = true;

        emit VoterRegistered(address_);
    }

    //allowed users could send a proposal
    function sendProposal(string calldata description) external isRegistered {
        require(WorkflowStatus.ProposalsRegistrationStarted == status, Errors.PROPOSAL_NOT_OPENED);

        Proposal memory proposal;
        proposal._description = description;
        _proposals.push(proposal);

        emit ProposalRegistered(_proposals.length - 1);
    }

    //allowed users could send a vote
    function vote(uint proposalId) external isRegistered {//everyone could see proposals
        require(WorkflowStatus.VotingSessionStarted == status, Errors.VOTE_NOT_OPENED);
        require(!_voters[msg.sender]._hasVoted, Errors.USER_ALREADY_VOTED);
        require(proposalId < _proposals.length, Errors.PROPOSAL_ID_NOT_FOUND);

        _voters[msg.sender]._hasVoted = true;
        _voters[msg.sender]._votedProposalId = proposalId;

        _proposals[proposalId]._voteCount++; 

        _hasVotes = true;

        emit Voted(msg.sender, proposalId);
    }

    /* GETTERS */

    //everyone could see proposals
    function getProposals() external view returns (Proposal[] memory) {
        require(_proposals.length > 0, Errors.PROPOSAL_EMPTY);
        return _proposals;
    }

    //only allowed users could observe other user votes
    function getUserVote(address address_) external view isRegistered returns (uint) {
        require(_voters[address_]._isRegistered, Errors.USER_NOT_REGISTERED);
        require(_voters[address_]._hasVoted, Errors.USER_NO_VOTE);

        return _voters[address_]._votedProposalId;
    }

    //everyone could see the winning proposal
    function getWinner() external view returns (uint[] memory) {
        require(WorkflowStatus.VotesTallied == status, Errors.VOTE_NOT_CLOSED);
        return _winningProposalIds;
    }

    /* PRIVATE FUNCTIONS */

    //automatically resolves the winning proposals
    //draw is allowed
    function _closeVote() private {
        assert(WorkflowStatus.VotesTallied == status);
        assert(_proposals.length > 0);

        uint maxCount;
        for (uint i = 0; i < _proposals.length; i++) {

            if (_proposals[i]._voteCount > maxCount)
                maxCount = _proposals[i]._voteCount;
        }

        //draw: every proposal reaching maxCount wins
        for (uint i = 0; i < _proposals.length; i++) {
            
            if (_proposals[i]._voteCount == maxCount)
                _winningProposalIds.push(i);
        }
    }   
}

library Errors {

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