const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestBuilciber", function() {
    async function deployContract() {
        const [owner, otherAccount] = await ethers.getSigners();
        console.log(`Owner wallet address: ${owner.address}`);

        const factory = await ethers.getContractFactory("TestBuilciber");
        const lockDuration = 60 * 60 * 24 * 365;
        const contract = await factory.deploy(lockDuration);

        return { owner, otherAccount, lockDuration, contract };
    }

    describe("Deployment", function() {
        it("Should set the correct lock duration", async function () {
            const { contract, lockDuration } = await loadFixture(deployContract);
            expect(await contract.lockDuration()).to.equal(lockDuration);
        });

        it("Should set the right owner", async function () {
            const { contract, owner } = await loadFixture(deployContract);
            expect(await contract.owner()).to.equal(owner.address);
        });

        it("Should set the correct lock start time", async function () {
            const { contract } = await loadFixture(deployContract);
            const latestBlockNumber = await ethers.provider.getBlockNumber();
            const latestBlock = await ethers.provider.getBlock(latestBlockNumber);
            const lockStart = latestBlock.timestamp;
            expect (await contract.lockStart()).to.equal(BigInt(lockStart));
        });

        it("Should mint tokens to owner address", async function () {
            const { contract, owner } = await loadFixture(deployContract);
            const ownerBalance = await contract.balanceOf(owner.address);
            expect(ownerBalance).to.equal(1_000_000_000_000_000_000_000_000n);
        });
    });

    describe("Change lock duration", function () {
        it("Should only be callable by owner", async function () {
            const { otherAccount, contract } = await loadFixture(deployContract);
            await expect(contract.connect(otherAccount).changeLockDuration(0)).to.be.revertedWith("Only the owner can call this function");
        });

        it("Should change the current lock duration", async function () {
            const { contract } = await loadFixture(deployContract);
            const newLockDuration = 0;
            await contract.changeLockDuration(newLockDuration);
            expect(await contract.lockDuration()).to.equal(0);
        });
    });

    describe("Change owner", function () {
        it("Should only be callable by owner", async function () {
            const { owner, otherAccount, contract } = await loadFixture(deployContract);
            await expect(contract.connect(otherAccount).changeOwner(owner.address)).to.be.revertedWith("Only the owner can call this function");
        });

        it("Should change owner to the given owner", async function () {
            const { contract, otherAccount } = await loadFixture(deployContract);
            await contract.changeOwner(otherAccount.address);
            expect(await contract.owner()).to.equal(otherAccount.address);
        });
    });

    describe("Transfer", function () {
        it("Should transfer tokens if `transfer` is called by owner, locked or not", async function () {
            const { otherAccount, contract, lockDuration } = await loadFixture(deployContract);
            await expect(() => contract.transfer(otherAccount.address, 100)).to.changeTokenBalance(contract, otherAccount, 100);
            // check that token is transferrable by owner when unlocked
            const lockStart = await contract.lockStart();
            time.increaseTo(lockStart + BigInt(lockDuration));
            await expect(() => contract.transfer(otherAccount.address, 100)).to.changeTokenBalance(contract, otherAccount, 100);
        });
        
        it("Should revert if lock duration is NOT expired and caller is NOT owner", async function () {
            const { contract, otherAccount, owner } = await loadFixture(deployContract);
            await contract.transfer(otherAccount.address, 100);
            await expect(contract.connect(otherAccount).transfer(owner.address, 100)).to.be.revertedWith("You cannot transfer this token yet");
        });

        it("Should be burnable, locked or not, token owner or not", async function () {
            const { contract, owner, otherAccount,lockDuration } = await loadFixture(deployContract);
            const zeroAddress = ethers.ZeroAddress;
            await contract.transfer(otherAccount.address, 200);
            await expect(contract.connect(otherAccount).burn(100)).to.emit(contract, "Transfer").withArgs(otherAccount.address, zeroAddress, 100);
            await expect(contract.burn(100)).to.emit(contract, "Transfer").withArgs(owner.address, zeroAddress, 100);
            // check that token is burnable by token owner and by non token-owner if token is unlocked
            const lockStart = await contract.lockStart();
            time.increaseTo(lockStart + BigInt(lockDuration));
            await expect(contract.connect(otherAccount).burn(100)).to.emit(contract, "Transfer").withArgs(otherAccount.address, zeroAddress, 100);
            await expect(contract.burn(100)).to.emit(contract, "Transfer").withArgs(owner.address, zeroAddress, 100);
        });

        it("Should transfer tokens if lock duration IS expired and caller is NOT owner", async function () {
            const { contract, otherAccount, owner, lockDuration } = await loadFixture(deployContract);
            const lockStart = await contract.lockStart();
            time.increaseTo(lockStart + BigInt(lockDuration));
            await contract.transfer(otherAccount.address, 200);
            await expect(() => contract.connect(otherAccount).transfer(owner.address, 100)).to.changeTokenBalance(contract, owner, 100);
        });
    });

    describe("Approve", function () {
        it("Should approve tokens if `approve` is called by owner, locked or not", async function () {
            const { otherAccount, owner, contract, lockDuration } = await loadFixture(deployContract);
            await expect(contract.approve(otherAccount.address, 100)).to.emit(contract, "Approval").withArgs(owner.address, otherAccount.address, 100);
            // check that token is approvable by owner when unlocked
            const lockStart = await contract.lockStart();
            time.increaseTo(lockStart + BigInt(lockDuration));
            await expect(contract.approve(otherAccount.address, 100)).to.emit(contract, "Approval").withArgs(owner.address, otherAccount.address, 100);
        });
        
        it("Should revert if lock duration is NOT expired and caller is NOT owner", async function () {
            const { contract, otherAccount, owner } = await loadFixture(deployContract);
            await expect(contract.connect(otherAccount).approve(owner.address, 100)).to.be.revertedWith("You cannot spend this token yet");
        });

        it("Should approve tokens if lock duration IS expired and caller is NOT owner", async function () {
            const { contract, otherAccount, owner, lockDuration } = await loadFixture(deployContract);
            const lockStart = await contract.lockStart();
            time.increaseTo(lockStart + BigInt(lockDuration));
            await expect(contract.connect(otherAccount).approve(owner.address, 100)).to.emit(contract, "Approval").withArgs(otherAccount.address, owner.address, 100);
        });
    });
});