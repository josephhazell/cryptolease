export const TenancyIndexABI = {
  "abi": [
    {
      "inputs": [],
      "name": "ZamaProtocolUnsupported",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        }
      ],
      "name": "TenancyClosed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "landlord",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "tenant",
          "type": "address"
        }
      ],
      "name": "TenancyRegistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        }
      ],
      "name": "closeTenancy",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "confidentialProtocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        }
      ],
      "name": "fetchTenancy",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "leaseId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "landlord",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tenant",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "leaseCID",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "rentAmount",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "periodSeconds",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "endDate",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "active",
              "type": "bool"
            }
          ],
          "internalType": "struct TenancyIndex.Tenancy",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tenant",
          "type": "address"
        }
      ],
      "name": "listTenanciesByGuest",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "landlord",
          "type": "address"
        }
      ],
      "name": "listTenanciesByHost",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextTenancyId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tenant",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "leaseCID",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "rentAmount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "periodSeconds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endDate",
          "type": "uint256"
        }
      ],
      "name": "registerTenancy",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "newLeaseCID",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "newRentAmount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "newToken",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "newPeriodSeconds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "newStartDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "newEndDate",
          "type": "uint256"
        }
      ],
      "name": "reviseTenancy",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tenancies",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "leaseId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "landlord",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tenant",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "leaseCID",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "rentAmount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "periodSeconds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endDate",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "active",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
} as const;
