const { expect } = require('chai');
const { waffle} = require("hardhat");
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const web3 = require('web3');
const { keccak256, toUtf8Bytes } = require("ethers/lib/utils");


const SIDE = {
    Yes: 0,
    No: 1
};

const STATUS = {
    Undecided: 0,
    Approved: 1,
    Rejected: 2
};

describe('Contract: DAO', () => {

	let Token, token, DAO, dao, owner, addr1, addr2;

	const TOTAL_SUPPLY = ethers.utils.parseUnits("10000", process.env.TOKEN_DECIMALS);

	const proposalID = keccak256(toUtf8Bytes("Mint 100 tokens"));
    const proposalData = "0x40c10f19000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000056BC75E2D63100000";


    beforeEach(async () => {

		[owner, addr1, addr2] = await hre.ethers.getSigners();

        Token = await hre.ethers.getContractFactory("Token");
        DAO = await hre.ethers.getContractFactory("DAO");

        token = await Token.deploy('DAOToken', 'DAOT');
        dao = await DAO.deploy(token.address);        

    });

	describe("Deposit and withdraw func", function () {

    	it('Should deposit governance tokens', async function () {

			await token.approve(dao.address, ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));
        	await dao.deposit(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));
			
			expect(await dao.getShares()).to.equal(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));

    	});

		it('Should not withdraw governance tokens - not enough shares', async () => {
			
			await token.approve(dao.address, ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));
			await dao.deposit(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));

			await expect(dao.withdraw(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS), proposalID)).to.be.revertedWith('Not enough shares');

		});

		it('Should withdraw tokens', async () => {

			await token.approve(dao.address, ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));

			await dao.deposit(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));
			expect(await dao.getShares()).to.equal(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS));

            await dao.createProposal(proposalID, token.address, proposalData);
            await dao.vote(proposalID, SIDE.Yes);
            await expect(dao.withdraw(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS), proposalID)).to.be.revertedWith('Voting period is not over');

            await time.increase(260000);

			await dao.withdraw(ethers.utils.parseUnits("100", process.env.TOKEN_DECIMALS), proposalID);

			expect(await dao.getShares()).to.equal("0");

			expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
			
		});

	});

	describe("Proposal", function () {

    	it(`Shouldn't create a proposal - already exists`, async () => {

			await dao.createProposal(proposalID, token.address, proposalData);

			await expect(dao.createProposal(proposalID, token.address, proposalData)).to.be.revertedWith('Proposal already exists');

		});

		it(`Should create a proposal without admin role`, async () => {

			await expect(dao.connect(addr1).createProposal(proposalID, token.address, proposalData)).to.be.revertedWith('Caller is not a admin');

		});

		it('Should create a proposal', async () => {

			await dao.createProposal(proposalID, token.address, proposalData);
			const proposal = await dao.proposals(proposalID);

			expect(await proposal.votesYes).to.equal("0");
            expect(await proposal.votesNo).to.equal("0");
            expect(await proposal.status).to.equal(STATUS.Undecided);

		});

	});

    describe("Voting", function () {

        it('Should voting', async () => {

            await token.approve(addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.approve(addr2.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr2).transferFrom(owner.address, addr2.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            await token.connect(addr1).approve(dao.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr2).approve(dao.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
        	await dao.connect(addr1).deposit(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await dao.connect(addr2).deposit(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            expect(await dao.connect(addr1).getShares()).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await dao.connect(addr2).getShares()).to.equal(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            await dao.createProposal(proposalID, token.address, proposalData);

            await dao.connect(addr1).vote(proposalID, SIDE.Yes);
            await dao.connect(addr2).vote(proposalID, SIDE.No);

			const proposal = await dao.proposals(proposalID);

			expect(await proposal.votesYes).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await proposal.votesNo).to.equal(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
            expect(await proposal.status).to.equal(STATUS.Undecided);

		});

        it('Should not vote twice', async () => {

            await token.approve(addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));

            await token.connect(addr1).approve(dao.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await dao.connect(addr1).deposit(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await dao.connect(addr1).getShares()).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));

            await dao.createProposal(proposalID, token.address, proposalData)

            await dao.connect(addr1).vote(proposalID, SIDE.Yes);

            await expect(dao.connect(addr1).vote(proposalID, SIDE.Yes)).to.be.revertedWith('Already voted');

        });

        it('Should proposal does not exist', async () => {

            await token.approve(addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));

            await token.connect(addr1).approve(dao.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await dao.connect(addr1).deposit(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await dao.connect(addr1).getShares()).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));

            await expect(dao.connect(addr1).vote(proposalID, SIDE.Yes)).to.be.revertedWith('Proposal does not exist');

        });

    });

    describe("Finish", function () {

        it('Should finish when period is not over', async () => {

            await token.approve(addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));

            await token.connect(addr1).approve(dao.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await dao.connect(addr1).deposit(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await dao.connect(addr1).getShares()).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));

            const data = token.interface.encodeFunctionData("mint", ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266","100000000000000000000"]);
            await dao.createProposal(proposalID, token.address, data)

            await dao.connect(addr1).vote(proposalID, SIDE.Yes);

            await expect(dao.connect(addr1).finish(proposalID)).to.be.revertedWith('Voting period is not over');

        });

        it('Should finish with true vote', async () => {

            await token.approve(addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.approve(addr2.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr2).transferFrom(owner.address, addr2.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            await token.connect(addr1).approve(dao.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr2).approve(dao.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
        	await dao.connect(addr1).deposit(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await dao.connect(addr2).deposit(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            expect(await dao.connect(addr1).getShares()).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await dao.connect(addr2).getShares()).to.equal(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            const data = token.interface.encodeFunctionData("mint", ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266","100000000000000000000"]);
            await dao.createProposal(proposalID, token.address, data);

            await dao.connect(addr1).vote(proposalID, SIDE.No);
            await dao.connect(addr2).vote(proposalID, SIDE.Yes);            

            await time.increase(260000);

            await dao.connect(addr1).finish(proposalID);
            const proposal = await dao.proposals(proposalID);

            expect(await proposal.status).to.equal(STATUS.Approved);

            await dao.connect(addr1).withdraw(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS), proposalID);
            await dao.connect(addr2).withdraw(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS), proposalID);

        });

        it('Should finish with false vote', async () => {

            await token.approve(addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.approve(addr2.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr2).transferFrom(owner.address, addr2.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            await token.connect(addr1).approve(dao.address, ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await token.connect(addr2).approve(dao.address, ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));
        	await dao.connect(addr1).deposit(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            await dao.connect(addr2).deposit(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            expect(await dao.connect(addr1).getShares()).to.equal(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS));
            expect(await dao.connect(addr2).getShares()).to.equal(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS));

            const data = token.interface.encodeFunctionData("mint", ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266","100000000000000000000"]);
            await dao.createProposal(proposalID, token.address, data);

            await dao.connect(addr1).vote(proposalID, SIDE.Yes);
            await dao.connect(addr2).vote(proposalID, SIDE.No);            

            await time.increase(260000);

            await dao.connect(addr1).finish(proposalID);
            const proposal = await dao.proposals(proposalID);

            expect(await proposal.status).to.equal(STATUS.Rejected);

            await dao.connect(addr1).withdraw(ethers.utils.parseUnits("200", process.env.TOKEN_DECIMALS), proposalID);
            await dao.connect(addr2).withdraw(ethers.utils.parseUnits("300", process.env.TOKEN_DECIMALS), proposalID);

        });
    
    });

    describe("Others func", function () {

        it('Should change votingPeriod', async () => {

            expect(await dao.periodDuration()).to.equal(259200);

            await expect(dao.connect(addr1).changeVotingPeriod(2000)).to.be.revertedWith('Caller is not a admin');
            await dao.changeVotingPeriod(2000);

            expect(await dao.periodDuration()).to.equal(2000);

        });

        it('Should change approvedPercent', async () => {

            expect(await dao.approvedPercent()).to.equal(50);

            await expect(dao.connect(addr1).changeApprovedPercent(70)).to.be.revertedWith('Caller is not a admin');
            await dao.changeApprovedPercent(70);

            expect(await dao.approvedPercent()).to.equal(70);

        });

    });

});