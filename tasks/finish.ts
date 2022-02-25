import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-web3";

task("addProposal", "Add new proposal")
    .addParam("proposalHash", "Proposal")
    .setAction(async (args) => {

        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_ADDRESS);
        await (await dao.finish(args.proposalHash)).wait()
 
    });

export default  {};