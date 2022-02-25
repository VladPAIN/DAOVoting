import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-web3";

task("addProposal", "Add new proposal")
    .addParam("proposalHash", "Proposal")
    .addParam("addressProposalData", "Proposal address caller")
    .addParam("proposalData", "Proposal data")
    .setAction(async (args) => {

        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_ADDRESS);
        await (await dao.createProposal(args.proposalHash, args.addressProposalData, args.proposalData)).wait()
        console.log("You are create proposal");
 
    });

export default  {};