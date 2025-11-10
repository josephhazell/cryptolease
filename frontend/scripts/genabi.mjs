import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = path.join(process.cwd(), '..', 'contracts');
const artifactsDir = path.join(repoRoot, 'artifacts', 'contracts');
const deploymentsDir = path.join(repoRoot, 'deployments');
const outDir = path.join(process.cwd(), 'abi');

async function readAbi(contractName) {
  const p = path.join(artifactsDir, contractName, `${contractName.split('/').pop().replace('.sol','')}.json`);
  const raw = await fs.readFile(p, 'utf8');
  const json = JSON.parse(raw);
  return json.abi;
}

async function readDeployments() {
  try {
    const files = await fs.readdir(deploymentsDir);
    const map = {};
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const raw = await fs.readFile(path.join(deploymentsDir, f), 'utf8');
      const json = JSON.parse(raw);
      map[String(json.chainId)] = json;
    }
    return map;
  } catch { return {}; }
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const tenancyAbi = await readAbi('TenancyIndex.sol');
  const vaultAbi = await readAbi('RentVault.sol');
  await fs.writeFile(path.join(outDir, 'TenancyIndexABI.ts'), `export const TenancyIndexABI = ${JSON.stringify({ abi: tenancyAbi }, null, 2)} as const;\n`);
  await fs.writeFile(path.join(outDir, 'RentVaultABI.ts'), `export const RentVaultABI = ${JSON.stringify({ abi: vaultAbi }, null, 2)} as const;\n`);

  const deployments = await readDeployments();
  const addressMap = {};
  for (const [k, v] of Object.entries(deployments)) {
    addressMap[k] = { chainId: v.chainId, TenancyIndex: v.TenancyIndex, RentVault: v.RentVault };
  }
  await fs.writeFile(path.join(outDir, 'DeployedAddresses.ts'), `export const DeployedAddresses = ${JSON.stringify(addressMap, null, 2)} as const;\n`);
  console.log('ABI and addresses generated into frontend/abi');
}

main().catch((e) => { console.error(e); process.exit(1); });


