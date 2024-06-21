const ethers = require('ethers');
require('dotenv').config();

async function main() {

  const url = process.env.SEPOLIA_URL;

  const artifacts = await hre.artifacts.readArtifact("TestBuilciber");

  const provider = new ethers.JsonRpcProvider(url);

  const privateKey = process.env.PRIVATE_KEY;

  const wallet = new ethers.Wallet(privateKey, provider);

  // Create an instance of the contract Factory
  const factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);

  const lockDuration = 60 * 60 * 24 * 365;

  const resolvedContract = await factory.deploy(lockDuration);
  const contract = await resolvedContract.waitForDeployment()

  console.log("tBCB contract address: ", await contract.getAddress());

  const creatorBalance = await contract.balanceOf(wallet.address);
  console.log(`Token creator balance is ${creatorBalance} tBCB`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
});