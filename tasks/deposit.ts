import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-web3";

task("addProposal", "Add new proposal")
    .addParam("amount", "Amount tokens for deposit")
    .setAction(async (args) => {

        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_ADDRESS);
        await (await dao.deposit(args.amount)).wait()
 
    });

export default  {};