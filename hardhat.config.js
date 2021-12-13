require('dotenv').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');

task('Accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

module.exports = {
    solidity: '0.8.9',
    paths: {
        artifacts: './artifacts',
    },
    networks: {
        hardhat: {
            chainId: 1337,
        },
        rinkeby: {
            url: process.env.INFURA_RINKEBY_URI,
            accounts: [process.env.RINKEBY_ACCOUNT_PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};
