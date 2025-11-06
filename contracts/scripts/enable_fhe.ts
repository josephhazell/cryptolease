import { ethers } from "hardhat";
import path from "path";
import { promises as fs } from "fs";

async function main() {
  const net = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  const depPath = path.join(__dirname, "..", "deployments", `${net.chainId}.json`);
  const raw = await fs.readFile(depPath, "utf8");
  const json = JSON.parse(raw);
  const addr = json.RentVault as string;

  const vault = await ethers.getContractAt("RentVault", addr, deployer);
  console.log(`Network ${net.chainId}, caller(deployer) ${deployer.address}`);
  console.log(`RentVault @ ${addr}`);

  const current: boolean = await (vault as any).bypassFheVerify();
  if (current) {
    const tx = await (vault as any).setBypassFheVerify(false);
    console.log(`setBypassFheVerify(false) tx: ${tx.hash}`);
    await tx.wait();
  }
  const after: boolean = await (vault as any).bypassFheVerify();
  console.log(`bypassFheVerify = ${after}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


