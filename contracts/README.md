# RentChain Contracts

Setup environment variables in a `.env` file at this folder root:

```
PRIVATE_KEY=YOUR_PRIVATE_KEY
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

Commands:
- `npm run build`
- `npm run deploy:localhost`
- `npm run deploy:sepolia`
- `npm run verify:sepolia <DEPLOYED_ADDRESS> [...constructorArgs]`

Artifacts will be generated in `artifacts/`.
Deploy script writes a `deployments/<chainId>.json` file with deployed addresses.


