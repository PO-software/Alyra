export const CONTRACT_ADDRESS = "0x067247309EfdFC3Ff6D473221688f4148FA7443b";
export const CONTRACT_ABI = [
    {
      "inputs": [],
      "name": "Bank__NotEnoughEthersOnTheSC",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "Bank__NotEnoughFundsProvided",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "Bank__WithdrawFailed",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "getBalanceOfUser",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sendEthers",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]