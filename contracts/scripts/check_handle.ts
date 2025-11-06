import { ethers } from "hardhat";
import path from "path";
import { promises as fs } from "fs";

async function main() {
  const ridRaw = process.env.RECEIPT_ID ?? "1";
  const rid = BigInt(ridRaw);
  const net = await ethers.provider.getNetwork();
  const depPath = path.join(__dirname, "..", "deployments", `${net.chainId}.json`);
  const json = JSON.parse(await fs.readFile(depPath, "utf8"));
  const addr = json.RentVault as string;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("RentVault", addr, signer);
  const handle: string = await (vault as any).viewEncryptedAmount(rid);
  console.log(`caller ${await signer.getAddress()}, handle for receipt ${rid}: ${handle}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


