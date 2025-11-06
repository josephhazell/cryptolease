// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract TenancyIndex is ZamaEthereumConfig {
    struct Tenancy {
        uint256 leaseId;
        address landlord;
        address tenant;
        string leaseCID;       // IPFS metadata
        uint256 rentAmount;    // in token decimals
        address token;         // address(0) for ETH
        uint256 periodSeconds; // payment period in seconds
        uint256 startDate;     // unix seconds
        uint256 endDate;       // unix seconds
        bool active;
    }

    event TenancyRegistered(uint256 indexed leaseId, address indexed landlord, address indexed tenant);
    event TenancyClosed(uint256 indexed leaseId);

    uint256 public nextTenancyId = 1;
    mapping(uint256 => Tenancy) public tenancies;
    mapping(address => uint256[]) private _tenancyIdsByHost;
    mapping(address => uint256[]) private _tenancyIdsByGuest;

    modifier onlyLandlord(uint256 leaseId) {
        require(tenancies[leaseId].landlord == msg.sender, "Only landlord");
        _;
    }

    modifier onlyLandlordOrTenant(uint256 leaseId) {
        require(
            tenancies[leaseId].landlord == msg.sender || tenancies[leaseId].tenant == msg.sender,
            "Only landlord or tenant"
        );
        _;
    }

    function registerTenancy(
        address tenant,
        string memory leaseCID,
        uint256 rentAmount,
        address token,
        uint256 periodSeconds,
        uint256 startDate,
        uint256 endDate
    ) external returns (uint256 leaseId) {
        require(tenant != address(0), "Invalid tenant");
        require(bytes(leaseCID).length > 0, "leaseCID required");
        require(rentAmount > 0, "rentAmount required");
        require(periodSeconds > 0, "period required");
        require(startDate < endDate, "start < end");

        leaseId = nextTenancyId++;
        tenancies[leaseId] = Tenancy({
            leaseId: leaseId,
            landlord: msg.sender,
            tenant: tenant,
            leaseCID: leaseCID,
            rentAmount: rentAmount,
            token: token,
            periodSeconds: periodSeconds,
            startDate: startDate,
            endDate: endDate,
            active: true
        });

        _tenancyIdsByHost[msg.sender].push(leaseId);
        _tenancyIdsByGuest[tenant].push(leaseId);

        emit TenancyRegistered(leaseId, msg.sender, tenant);
    }

    function reviseTenancy(
        uint256 leaseId,
        string memory newLeaseCID,
        uint256 newRentAmount,
        address newToken,
        uint256 newPeriodSeconds,
        uint256 newStartDate,
        uint256 newEndDate
    ) external onlyLandlord(leaseId) {
        Tenancy storage l = tenancies[leaseId];
        require(l.active, "inactive");
        if (bytes(newLeaseCID).length > 0) l.leaseCID = newLeaseCID;
        if (newRentAmount > 0) l.rentAmount = newRentAmount;
        l.token = newToken;
        if (newPeriodSeconds > 0) l.periodSeconds = newPeriodSeconds;
        if (newStartDate > 0) l.startDate = newStartDate;
        if (newEndDate > 0) l.endDate = newEndDate;
    }

    function closeTenancy(uint256 leaseId) external onlyLandlordOrTenant(leaseId) {
        Tenancy storage l = tenancies[leaseId];
        require(l.active, "already inactive");
        l.active = false;
        emit TenancyClosed(leaseId);
    }

    function fetchTenancy(uint256 leaseId) external view returns (Tenancy memory) {
        return tenancies[leaseId];
    }

    function listTenanciesByHost(address landlord) external view returns (uint256[] memory) {
        return _tenancyIdsByHost[landlord];
    }

    function listTenanciesByGuest(address tenant) external view returns (uint256[] memory) {
        return _tenancyIdsByGuest[tenant];
    }
}


