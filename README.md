# mpceN's ERC721 Boilerplate for NFT's

## @mannydevs on Twitter

---

Pre-req's:

-   You'll need an `infura.io` account for your URL
-   You'll also need an `etherscan.io` API key

-   create a `.env` with the following environment variables
    -   `INFURA_RINKEBY_URI` - Your Infura.io uri for Rinkeby
    -   `RINKEBY_ACCOUNT_PRIVATE_KEY` - Your Rinkeby account private key. Must have ETH.
    -   `ETHERSCAN_API_KEY` - Your Etherscan API key used to verifying contracts
    -   `NFT_CONTRACT_NAME` - The contracts name
    -   `NFT_CONTRACT_INIT_BASE_URI` - The contracts initial base uri. This is usually the hidden one

Available Hardhat commands:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

## Deployment

-   `npx hardhat test`
-   `npm run deploy:{ENV}` where ENV can be `localhost` | `rinkeby`
-   `npx hardhat verify --network {NETWORK} {DEPLOYED_CONTRACT_ADDRESS}` to verify your contract on `etherscan.io`
