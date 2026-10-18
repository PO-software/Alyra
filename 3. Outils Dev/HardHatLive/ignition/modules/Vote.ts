import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VoteModule", (m) => {
  
    const vote = m.contract("Vote", ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"], {value: 100n});
    //m.call(vote, "register", ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"])
  
    return { vote };

});
