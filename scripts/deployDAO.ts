const { ethers } = require("ethers");
const hre = require("hardhat");

require("dotenv").config();

async function deployBridge() {
  const DAO = await hre.ethers.getContractFactory("DAO");
  const token = '0x2e3A98c7844413a95996A34e40a0F319e68c1d45';


  const dao = await DAO.deploy(token);
  console.log("Voting address: ", dao.address);
  await dao.deployed();

  await new Promise((resolve) => setTimeout(resolve, 60000));

  try {
    await hre.run("verify:verify", {
      address: dao.address,
      contract: "contracts/DAO.sol:DAO",
      constructorArguments: [token],
    });
    console.log("verify success");
  } catch (e) {
    console.log(e);
  }
}

deployBridge()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });