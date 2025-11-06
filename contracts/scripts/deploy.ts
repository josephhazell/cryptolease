import { ethers, network } from "hardhat";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const net = await ethers.provider.getNetwork();
  console.log(`Network: ${net.name} (${net.chainId})`);

  const TenancyIndex = await ethers.getContractFactory("TenancyIndex");
  const tenancyIndex = await TenancyIndex.deploy();
  await tenancyIndex.waitForDeployment();
  const tenancyIndexAddress = await tenancyIndex.getAddress();
  console.log(`TenancyIndex: ${tenancyIndexAddress}`);

  const RentVault = await ethers.getContractFactory("RentVault");
  const rentVault = await RentVault.deploy(tenancyIndexAddress);
  await rentVault.waitForDeployment();
  const rentVaultAddress = await rentVault.getAddress();
  console.log(`RentVault: ${rentVaultAddress}`);

  const outDir = path.join(__dirname, "..", "deployments");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${net.chainId}.json`);
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        chainId: Number(net.chainId),
        network: network.name,
        TenancyIndex: tenancyIndexAddress,
        RentVault: rentVaultAddress
      },
      null,
      2
    )
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


