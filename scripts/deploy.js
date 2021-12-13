const hre = require('hardhat');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);

    const NFT = await hre.ethers.getContractFactory('NFT');
    const nft = await NFT.deploy('ipfs://initial_base_uri');
    await nft.deployed();

    console.log(
        'NFT deployed to:',
        process.env.NODE_ENV,
        'with contract address:',
        nft.address
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
