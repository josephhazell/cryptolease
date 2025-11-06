// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface ITenancyIndex {
    function tenancies(uint256 leaseId)
        external
        view
        returns (
            uint256,
            address,
            address,
            string memory,
            uint256,
            address,
            uint256,
            uint256,
            uint256,
            bool
        );
}

contract RentVault is ZamaEthereumConfig, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Receipt {
        uint256 receiptId;
        uint256 leaseId;
        address payer;
        address payee;
        address token;
        uint256 amount; // clear amount paid
        uint256 timestamp;
        string receiptCID; // optional IPFS CID
        bytes32 txHashRef; // optional reference
        euint64 encryptedAmount; // FHE-encrypted amount mirror
    }

    event RentRemitted(
        uint256 indexed receiptId,
        uint256 indexed leaseId,
        address indexed payer,
        uint256 amount,
        address token
    );
    event BondLodged(uint256 leaseId, address from, uint256 amount, address token);
    event BondReleased(uint256 leaseId, address to, uint256 amount, address token);

    ITenancyIndex public immutable registry;

    uint256 public nextReceiptId = 1;
    mapping(uint256 => Receipt) public receipts; // receiptId => Receipt
    mapping(uint256 => uint256[]) public receiptsByLease; // leaseId => receiptIds
    mapping(address => uint256[]) public receiptsByUser; // user => receiptIds

    // security deposits (token address 0 = ETH)
    mapping(uint256 => uint256) public ethSecurityByLease; // in wei
    mapping(uint256 => mapping(address => uint256)) public erc20SecurityByLease; // token => amount

    // In local Mock-FHEVM testing, proof verification may be flaky on some setups.
    // This switch allows bypassing FHE fromExternal verification and using trivial
    // encryption (FHE.asEuint64). ONLY for local testing. Keep false on real networks.
    bool public bypassFheVerify = true;

    function setBypassFheVerify(bool v) external onlyOwner {
        bypassFheVerify = v;
    }

    constructor(address tenancyIndex) Ownable(msg.sender) {
        require(tenancyIndex != address(0), "invalid registry");
        registry = ITenancyIndex(tenancyIndex);
    }

    function _getLease(uint256 leaseId)
        internal
        view
        returns (
            address landlord,
            address tenant,
            uint256 rentAmount,
            address token,
            bool active
        )
    {
        (
            ,
            landlord,
            tenant,
            ,
            rentAmount,
            token,
            ,
            ,
            ,
            active
        ) = registry.tenancies(leaseId);
    }

    function remitRent(
        uint256 leaseId,
        externalEuint64 amountExt,
        bytes calldata inputProof,
        string calldata receiptCID
    ) external payable nonReentrant {
        (address landlord, address tenant, uint256 rentAmount, address token, bool active) = _getLease(leaseId);
        require(active, "lease inactive");
        require(token == address(0), "use token method");
        require(msg.sender == tenant, "only tenant");
        require(msg.value == rentAmount, "invalid msg.value");

        euint64 enc = bypassFheVerify
            ? FHE.asEuint64(uint64(msg.value))
            : FHE.fromExternal(amountExt, inputProof);

        uint256 rid = nextReceiptId++;
        receipts[rid] = Receipt({
            receiptId: rid,
            leaseId: leaseId,
            payer: msg.sender,
            payee: landlord,
            token: address(0),
            amount: msg.value,
            timestamp: block.timestamp,
            receiptCID: receiptCID,
            txHashRef: bytes32(0),
            encryptedAmount: enc
        });

        receiptsByLease[leaseId].push(rid);
        receiptsByUser[msg.sender].push(rid);
        receiptsByUser[landlord].push(rid);

        // On local dev chains (no FHE precompiles), skip allowances to avoid revert during gas estimation
        if (!bypassFheVerify) {
            FHE.allowThis(enc);
            FHE.allow(enc, msg.sender);
            FHE.allow(enc, landlord);
        }

        (bool ok, ) = payable(landlord).call{value: msg.value}("");
        require(ok, "transfer failed");

        emit RentRemitted(rid, leaseId, msg.sender, msg.value, address(0));
    }

    function remitRentToken(
        uint256 leaseId,
        uint256 amount,
        externalEuint64 amountExt,
        bytes calldata inputProof,
        string calldata receiptCID
    ) external nonReentrant {
        (address landlord, address tenant, uint256 rentAmount, address token, bool active) = _getLease(leaseId);
        require(active, "lease inactive");
        require(token != address(0), "ETH lease");
        require(msg.sender == tenant, "only tenant");
        require(amount == rentAmount, "invalid amount");

        IERC20(token).safeTransferFrom(msg.sender, landlord, amount);

        euint64 enc = bypassFheVerify
            ? FHE.asEuint64(uint64(amount))
            : FHE.fromExternal(amountExt, inputProof);

        uint256 rid = nextReceiptId++;
        receipts[rid] = Receipt({
            receiptId: rid,
            leaseId: leaseId,
            payer: msg.sender,
            payee: landlord,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            receiptCID: receiptCID,
            txHashRef: bytes32(0),
            encryptedAmount: enc
        });

        receiptsByLease[leaseId].push(rid);
        receiptsByUser[msg.sender].push(rid);
        receiptsByUser[landlord].push(rid);

        // On local dev chains (no FHE precompiles), skip allowances to avoid revert during gas estimation
        if (!bypassFheVerify) {
            FHE.allowThis(enc);
            FHE.allow(enc, msg.sender);
            FHE.allow(enc, landlord);
        }

        emit RentRemitted(rid, leaseId, msg.sender, amount, token);
    }

    function lodgeBond(uint256 leaseId) external payable nonReentrant {
        (address landlord, address tenant, , address token, bool active) = _getLease(leaseId);
        require(active, "inactive");
        require(token == address(0), "use token version");
        require(msg.sender == tenant, "only tenant");
        require(msg.value > 0, "zero");
        ethSecurityByLease[leaseId] += msg.value;
        emit BondLodged(leaseId, msg.sender, msg.value, address(0));
    }

    function lodgeBondToken(uint256 leaseId, uint256 amount) external nonReentrant {
        (address landlord, address tenant, , address token, bool active) = _getLease(leaseId);
        require(active, "inactive");
        require(token != address(0), "ETH lease");
        require(msg.sender == tenant, "only tenant");
        require(amount > 0, "zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        erc20SecurityByLease[leaseId][token] += amount;
        emit BondLodged(leaseId, msg.sender, amount, token);
    }

    function releaseBond(uint256 leaseId, address to, uint256 amount) external nonReentrant {
        (address landlord, , , address token, ) = _getLease(leaseId);
        require(msg.sender == landlord || msg.sender == owner(), "not allowed");
        require(to != address(0) && amount > 0, "invalid");
        if (token == address(0)) {
            uint256 bal = ethSecurityByLease[leaseId];
            require(bal >= amount, "insufficient");
            ethSecurityByLease[leaseId] = bal - amount;
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "transfer failed");
        } else {
            uint256 bal = erc20SecurityByLease[leaseId][token];
            require(bal >= amount, "insufficient");
            erc20SecurityByLease[leaseId][token] = bal - amount;
            IERC20(token).safeTransfer(to, amount);
        }
        emit BondReleased(leaseId, to, amount, token);
    }

    function fetchReceiptsByTenancy(uint256 leaseId) external view returns (Receipt[] memory list) {
        uint256[] memory ids = receiptsByLease[leaseId];
        list = new Receipt[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = receipts[ids[i]];
        }
    }

    function fetchReceiptsByUser(address user) external view returns (Receipt[] memory list) {
        uint256[] memory ids = receiptsByUser[user];
        list = new Receipt[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = receipts[ids[i]];
        }
    }

    function viewEncryptedAmount(uint256 receiptId) external view returns (euint64) {
        return receipts[receiptId].encryptedAmount;
    }

    function authorizeReceipt(uint256 receiptId, address user) external onlyOwner {
        require(user != address(0), "invalid user");
        euint64 enc = receipts[receiptId].encryptedAmount;
        FHE.allowThis(enc);
        FHE.allow(enc, user);
        FHE.allow(enc, receipts[receiptId].payer);
        FHE.allow(enc, receipts[receiptId].payee);
    }
}


