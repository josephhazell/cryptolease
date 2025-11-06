import { ethers } from "hardhat";
import path from "path";
import { promises as fs } from "fs";

async function main() {
  const ridRaw = process.env.RECEIPT_ID ?? "1";
  const user = process.env.USER_ADDRESS;
  if (!user) throw new Error("USER_ADDRESS is required");
  const rid = BigInt(ridRaw);
  const net = await ethers.provider.getNetwork();
  const depPath = path.join(__dirname, "..", "deployments", `${net.chainId}.json`);
  const json = JSON.parse(await fs.readFile(depPath, "utf8"));
  const addr = json.RentVault as string;
  const [deployer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("RentVault", addr, deployer);
  console.log(`Authorize receipt ${rid} for ${user} on ${addr} as ${await deployer.getAddress()}`);
  const tx = await (vault as any).authorizeReceipt(rid, user);
  console.log(`tx: ${tx.hash}`);
  await tx.wait();
  console.log(`done`);
}

main().catch((e) => { console.error(e); process.exit(1); });


