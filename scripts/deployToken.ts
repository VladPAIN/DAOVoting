require("dotenv").config();

async function deployToken() {
	const Token = await hre.ethers.getContractFactory('Token');

	const token = await Token.deploy('MyToken', 'MTK');
	console.log('MyToken address: ', token.address);
	await token.deployed();

    await new Promise((resolve) => setTimeout(resolve, 60000));

	try {
		await hre.run('verify:verify', {
			address: token.address,
			contract: 'contracts/ERC20.sol:Token',
			constructorArguments: [ 'MyToken', 'MTK' ],
		});
		console.log('verify success')
	} catch (e) {
		console.log(e)
	}

}

deployToken()
.then(() => process.exit(0))
.catch(error => {
	console.error(error)
	process.exit(1)
})