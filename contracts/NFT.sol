// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    enum SaleState {
        PRESALE,
        PUBLIC,
        PAUSED
    }
    string private _baseURIExtended;
    string public provenance;
    uint256 public constant COST = 0.05 ether;
    uint256 public MAX_SUPPLY = 100;
    uint256 public MAX_MINT_AMOUNT = 20;
    bool public isRevealed = false;
    SaleState public saleState = SaleState.PAUSED;

    mapping(address => uint8) private _allowList;

    constructor(string memory _initBaseURI) ERC721("NFT", "NFT") {
        setBaseURI(_initBaseURI);
    }

    // public & external
    function mint(uint256 _mintAmount) external payable {
        uint256 supply = totalSupply();

        require(saleState == SaleState.PUBLIC, "Sale is not public");
        require(_mintAmount > 0, "Mint at least 1");
        require(_mintAmount <= MAX_MINT_AMOUNT, "Exceeds allowed mint amount");
        require(supply + _mintAmount <= MAX_SUPPLY, "Insufficient supply");
        require(msg.value >= COST * _mintAmount, "Insufficient funds");

        for (uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function mintPresale(uint8 _mintAmount) external payable {
        uint256 supply = totalSupply();

        require(saleState == SaleState.PRESALE, "Sale is not presale");
        require(_mintAmount > 0, "Must mint at least 1");
        require(
            _mintAmount <= _allowList[msg.sender],
            "Exceeds allowed mint amount"
        );
        require(supply + _mintAmount <= MAX_SUPPLY, "Insufficient supply");

        _allowList[msg.sender] -= _mintAmount;

        for (uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function walletOfOwner(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);

        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }

        return tokenIds;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory currentBaseURI = _baseURI();

        if (isRevealed == false) {
            return currentBaseURI;
        }

        return
            bytes(currentBaseURI).length > 0
                ? string(abi.encodePacked(currentBaseURI, tokenId.toString()))
                : "";
    }

    function getAllowedMintCount(address _address)
        external
        view
        returns (uint8)
    {
        return _allowList[_address];
    }

    // internal
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIExtended;
    }

    // onlyOwner
    function reserve(uint256 _reserveAmount) external onlyOwner {
        uint256 supply = totalSupply();
        require(supply + _reserveAmount <= MAX_SUPPLY, "Insufficient supply");

        for (uint256 i = 1; i <= _reserveAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function setProvenance(string memory _provenance) external onlyOwner {
        provenance = _provenance;
    }

    function setSaleState(SaleState _saleState) external onlyOwner {
        saleState = _saleState;
    }

    function setAllowList(address[] calldata _list, uint8 _mintLimit)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < _list.length; i++) {
            _allowList[_list[i]] = _mintLimit;
        }
    }

    function reveal() external onlyOwner {
        isRevealed = true;
    }

    function getBaseURI() external view onlyOwner returns (string memory) {
        return _baseURI();
    }

    function setMaxMintAmount(uint256 _newmaxMintAmount) external onlyOwner {
        MAX_MINT_AMOUNT = _newmaxMintAmount;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        _baseURIExtended = _newBaseURI;
    }

    function withdraw() external payable onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}(
            ""
        );
        require(success);
    }
}
