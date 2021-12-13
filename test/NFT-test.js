const { expect } = require('chai');
const { ethers } = require('hardhat');
const web3 = require('web3');

describe('NFT', () => {
    const SaleState = {
        PRESALE: 0,
        PUBLIC: 1,
        PAUSED: 2,
    };
    let contract;
    let owner;
    let otherAccount;

    beforeEach(async () => {
        const BASE_URI = 'ipfs://initial_base_uri/';
        const NFT = await ethers.getContractFactory('NFT');

        [owner, otherAccount, otherAccount2, otherAccount3] =
            await ethers.getSigners();
        contract = await NFT.deploy(BASE_URI);

        await contract.deployed();
    });

    describe('Contract initialization', () => {
        it('Has correct name', async () => {
            expect(await contract.name()).to.equal('NFT');
        });

        it('Has correct symbol', async () => {
            expect(await contract.symbol()).to.equal('NFT');
        });

        it('Has correct cost', async () => {
            const cost = await contract.cost();
            expect(cost).to.equal(web3.utils.toWei('0.05', 'ether'));
        });

        it('Has correct max supply', async () => {
            expect(await contract.maxSupply()).to.equal(100);
        });

        it('Has correct max mint amount', async () => {
            expect(await contract.maxMintAmount()).to.equal(20);
        });

        it('Is initially paused', async () => {
            expect(await contract.saleState()).to.equal(SaleState.PAUSED);
        });

        it('Is initially unrevealed', async () => {
            expect(await contract.isRevealed()).to.equal(false);
        });

        it('Has correct baseURI', async () => {
            expect(await contract.getBaseURI()).to.equal(
                'ipfs://initial_base_uri/'
            );
        });

        it('Has the correct owner', async () => {
            expect(await contract.owner()).to.equal(owner.address);
        });
    });

    describe('Sale States', () => {
        it('The contract should initially be deployed in paused state', async () => {
            expect(await contract.saleState()).to.equal(SaleState.PAUSED);
        });

        it('Should set different sale states', async () => {
            expect(await contract.saleState()).to.equal(SaleState.PAUSED);
            await contract.setSaleState(SaleState.PRESALE);
            expect(await contract.saleState()).to.equal(SaleState.PRESALE);

            await contract.setSaleState(SaleState.PUBLIC);
            expect(await contract.saleState()).to.equal(SaleState.PUBLIC);

            await contract.setSaleState(SaleState.PRESALE);
        });

        it('Should not allow non-owners to set sale state', async () => {
            await expect(
                contract.connect(otherAccount).setSaleState(SaleState.PUBLIC)
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
    });

    describe('Paused', () => {
        beforeEach(async () => {
            await contract.setSaleState(SaleState.PAUSED);
            const allowList = [otherAccount.address];
            await contract.setAllowList(allowList, 1);
        });

        it('Prevents presale minting when contract is paused', async () => {
            await expect(
                contract.connect(otherAccount).mintPresale(1)
            ).to.be.revertedWith('Sale is not presale');
        });

        it('Prevents public minting when contract is paused', async () => {
            await expect(
                contract.connect(otherAccount).mint(1)
            ).to.be.revertedWith('Sale is not public');
        });
    });

    describe('Presale', () => {
        beforeEach(async () => {
            await contract.setSaleState(SaleState.PRESALE);
        });

        it('Lets the owner set the allow list', async () => {
            const allowList = [otherAccount.address, otherAccount2.address];
            await contract.setAllowList(allowList, 3);
            await expect(
                contract.connect(otherAccount).setAllowList(allowList, 3)
            ).to.be.revertedWith('Ownable: caller is not the owner');

            expect(
                await contract.getAllowedMintCount(otherAccount.address)
            ).to.equal(3);
            expect(
                await contract.getAllowedMintCount(otherAccount2.address)
            ).to.equal(3);
            expect(
                await contract.getAllowedMintCount(otherAccount3.address)
            ).to.equal(0);
        });

        it('Prevents non-whitelisted users from minting during presale', async () => {
            const allowList = [otherAccount.address, otherAccount2.address];
            await contract.setAllowList(allowList, 2);
            await expect(contract.connect(otherAccount3).mintPresale(1)).to.be
                .reverted;
            await expect(
                contract.connect(otherAccount3).mint(1)
            ).to.be.revertedWith('Sale is not public');
        });

        it('Lets whitelisted users mint during presale state', async () => {
            const allowList = [otherAccount.address, otherAccount2.address];
            await contract.setAllowList(allowList, 3);

            expect(await contract.connect(otherAccount).mintPresale(2))
                .to.emit(contract, 'Transfer')
                .withArgs(ethers.constants.AddressZero, otherAccount.address, 1)
                .withArgs(
                    ethers.constants.AddressZero,
                    otherAccount.address,
                    2
                );
            expect(await contract.connect(otherAccount2).mintPresale(1))
                .to.emit(contract, 'Transfer')
                .withArgs(
                    ethers.constants.AddressZero,
                    otherAccount2.address,
                    3
                );
        });

        it('Reduces the amount of mints available after minting', async () => {
            const allowList = [otherAccount.address, otherAccount2.address];
            await contract.setAllowList(allowList, 2);
            await contract.connect(otherAccount).mintPresale(2);
            await contract.connect(otherAccount2).mintPresale(1);
            await expect(
                contract.connect(otherAccount).mintPresale(1)
            ).to.be.revertedWith('Exceeds allowed mint amount');
            await contract.connect(otherAccount2).mintPresale(1);
        });
    });

    describe('Reveal', () => {
        it('Should reveal only once', async () => {
            expect(await contract.isRevealed()).to.equal(false);
            await contract.reveal();
            expect(await contract.isRevealed()).to.equal(true);
        });
    });

    describe('Public Minting - Unrevealed', () => {
        beforeEach(async () => {
            await contract.setSaleState(SaleState.PUBLIC);
        });

        it('The owner can successfully mint an NFT for free', async () => {
            expect(await contract.mint(2))
                .to.emit(contract, 'Transfer')
                .withArgs(ethers.constants.AddressZero, owner.address, 1)
                .withArgs(ethers.constants.AddressZero, owner.address, 2);
            expect(await contract.tokenURI(1)).to.equal(
                'ipfs://initial_base_uri/'
            );
            expect(await contract.tokenURI(2)).to.equal(
                'ipfs://initial_base_uri/'
            );
        });

        it('Non-owners can successfully mint multiple NFTs for a cost', async () => {
            const costPerMint = await contract.cost();
            const totalCost = web3.utils.toBN(costPerMint * 2);

            expect(
                await contract.connect(otherAccount).mint(2, {
                    value: totalCost.toString(),
                })
            )
                .to.emit(contract, 'Transfer')
                .withArgs(ethers.constants.AddressZero, otherAccount.address, 1)
                .withArgs(
                    ethers.constants.AddressZero,
                    otherAccount.address,
                    2
                );
            expect(await contract.tokenURI(1)).to.equal(
                'ipfs://initial_base_uri/'
            );
            expect(await contract.tokenURI(2)).to.equal(
                'ipfs://initial_base_uri/'
            );
        });
    });

    describe('Public Minting - Revealed', () => {
        beforeEach(async () => {
            await contract.setSaleState(SaleState.PUBLIC);
            await contract.setBaseURI('ipfs://base_uri/');
            await contract.reveal();
        });

        it('The owner can successfully mint an NFT for free', async () => {
            expect(await contract.mint(2))
                .to.emit(contract, 'Transfer')
                .withArgs(ethers.constants.AddressZero, owner.address, 1)
                .withArgs(ethers.constants.AddressZero, owner.address, 2);
            expect(await contract.tokenURI(1)).to.equal('ipfs://base_uri/1');
            expect(await contract.tokenURI(2)).to.equal('ipfs://base_uri/2');
        });

        it('Rejects non-owners from minting without enough funds', async () => {
            await expect(
                contract
                    .connect(otherAccount)
                    .mint(1, { value: web3.utils.toWei('0.01', 'ether') })
            ).to.be.revertedWith('Insufficient funds');

            await expect(
                contract
                    .connect(otherAccount)
                    .mint(1, { value: web3.utils.toWei('0.05', 'ether') })
            ).to.emit(contract, 'Transfer');
        });

        it('Non-owners can successfully mint multiple NFTs for a cost', async () => {
            const costPerMint = await contract.cost();
            const totalCost = web3.utils.toBN(costPerMint * 2);

            expect(
                await contract.connect(otherAccount).mint(2, {
                    value: totalCost.toString(),
                })
            )
                .to.emit(contract, 'Transfer')
                .withArgs(ethers.constants.AddressZero, otherAccount.address, 1)
                .withArgs(
                    ethers.constants.AddressZero,
                    otherAccount.address,
                    2
                );
            expect(await contract.tokenURI(1)).to.equal('ipfs://base_uri/1');
            expect(await contract.tokenURI(2)).to.equal('ipfs://base_uri/2');
        });

        it('Prevents users from minting more than the maxMintAmount', async () => {
            const costPerMint = await contract.cost();
            let totalCost = web3.utils.toBN(costPerMint * 21);

            await expect(contract.mint(21)).to.be.revertedWith(
                'Exceeds allowed mint amount'
            );

            await expect(
                contract
                    .connect(otherAccount)
                    .mint(21, { value: totalCost.toString() })
            ).to.be.revertedWith('Exceeds allowed mint amount');

            totalCost = web3.utils.toBN(costPerMint * 20);

            expect(await contract.mint(20)).to.emit(contract, 'Transfer');

            expect(
                await contract
                    .connect(otherAccount)
                    .mint(20, { value: totalCost.toString() })
            ).to.emit(contract, 'Transfer');
        });

        it('Prevents users from minting more than the maxSupply', async () => {
            const costPerMint = await contract.cost();
            let totalCost = web3.utils.toBN(costPerMint * 2);

            expect(await contract.mint(20)).to.emit(contract, 'Transfer');
            expect(await contract.mint(20)).to.emit(contract, 'Transfer');
            expect(await contract.mint(20)).to.emit(contract, 'Transfer');
            expect(await contract.mint(20)).to.emit(contract, 'Transfer');
            expect(await contract.mint(19)).to.emit(contract, 'Transfer');

            await expect(
                contract
                    .connect(otherAccount)
                    .mint(2, { value: totalCost.toString() })
            ).to.be.revertedWith('Insufficient supply');

            await expect(
                contract.connect(otherAccount).mint(1, { value: costPerMint })
            ).to.emit(contract, 'Transfer');
        });
    });

    describe('Non-minting Public functions', () => {
        beforeEach(async () => {
            await contract.reveal();
        });

        it('Returns the correct tokenIds of addresses', async () => {
            await contract.setSaleState(SaleState.PUBLIC);

            const costPerMint = await contract.cost();
            const totalCost = web3.utils.toBN(costPerMint * 2);

            await contract.mint(2);

            const ownerTokenCount = await contract.balanceOf(owner.address);
            const ownerTokenIds = [];

            for (let i = 0; i < ownerTokenCount; i++) {
                const tokenId = await contract.tokenOfOwnerByIndex(
                    owner.address,
                    i
                );

                ownerTokenIds.push(tokenId);
            }

            expect(ownerTokenIds[0]).to.equal(1);
            expect(ownerTokenIds[1]).to.equal(2);

            await contract
                .connect(otherAccount)
                .mint(1, { value: costPerMint });
            await contract
                .connect(otherAccount)
                .mint(2, { value: totalCost.toString() });

            const otherAccountTokenCount = await contract
                .connect(otherAccount)
                .balanceOf(otherAccount.address);
            const otherAccountTokenIds = [];

            for (let i = 0; i < otherAccountTokenCount; i++) {
                const tokenId = await contract
                    .connect(otherAccount)
                    .tokenOfOwnerByIndex(otherAccount.address, i);

                otherAccountTokenIds.push(tokenId);
            }

            expect(otherAccountTokenIds[0]).to.equal(3);
            expect(otherAccountTokenIds[1]).to.equal(4);
            expect(otherAccountTokenIds[2]).to.equal(5);
        });
    });

    describe('Only owner functions', () => {
        it('Sets the provenance hash', async () => {
            await contract.setProvenance('asdf123');
            expect(await contract.provenance()).to.equal('asdf123');
        });

        xit('Only the owner can set different costs', async () => {
            let cost = await contract.cost();

            expect(cost).to.equal(web3.utils.toWei('0.05', 'ether'));
            await contract.setCost(web3.utils.toWei('0.1', 'ether'));

            cost = await contract.cost();
            expect(cost).to.equal(web3.utils.toWei('0.1', 'ether'));

            await expect(
                contract
                    .connect(otherAccount)
                    .setCost(web3.utils.toWei('1', 'ether'))
            ).to.revertedWith('Ownable: caller is not the owner');
        });

        it('Only the owner can set max mint amount', async () => {
            let maxMintAmount = await contract.maxMintAmount();

            expect(maxMintAmount).to.equal(20);
            await contract.setMaxMintAmount(3);
            maxMintAmount = await contract.maxMintAmount();
            expect(maxMintAmount).to.equal(3);

            await expect(
                contract.connect(otherAccount).setMaxMintAmount(2)
            ).to.revertedWith('Ownable: caller is not the owner');
        });

        it('Only the owner can set the not revealed uri', async () => {
            let baseURI = await contract.getBaseURI();

            expect(baseURI).to.equal('ipfs://initial_base_uri/');
            await contract.setBaseURI('ipfs://base_uri/');

            baseURI = await contract.getBaseURI();
            expect(baseURI).to.equal('ipfs://base_uri/');

            await expect(
                contract.connect(otherAccount).setBaseURI('something')
            ).to.revertedWith('Ownable: caller is not the owner');
        });

        it('It reserves a set amount of NFTs', async () => {
            await contract.reserve(3);

            expect(await contract.balanceOf(owner.address)).to.equal(3);

            for (let i = 0; i < 3; i++) {
                expect(
                    await contract.tokenOfOwnerByIndex(owner.address, i)
                ).to.equal(i + 1);
            }

            // take a good look at indexes of mints
        });

        it('Only the owner can withdraw funds into their wallet', async () => {
            const originalBalance = await owner.getBalance();
            await contract.setSaleState(SaleState.PUBLIC);

            expect(
                Number(web3.utils.fromWei(originalBalance.toString(), 'ether'))
            ).to.be.closeTo(9999.82, 0.01);

            await contract
                .connect(otherAccount)
                .mint(20, { value: web3.utils.toWei('1', 'ether') });
            await contract.withdraw();

            const newOwnerBalance = await owner.getBalance();
            expect(
                Number(web3.utils.fromWei(newOwnerBalance.toString(), 'ether'))
            ).to.be.closeTo(10000.82, 0.01);

            await expect(
                contract.connect(otherAccount).withdraw()
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
    });
});
