import { ethers } from "hardhat";
import path from "path";
import { promises as fs } from "fs";

async function main() {
  const net = await ethers.provider.getNetwork();
  const depPath = path.join(__dirname, "..", "deployments", `${net.chainId}.json`);
  const json = JSON.parse(await fs.readFile(depPath, "utf8"));
  const addr = json.RentVault as string;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("RentVault", addr, signer);
  const nextId: bigint = await (vault as any).nextReceiptId();
  console.log(`Vault ${addr} nextReceiptId = ${nextId.toString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


