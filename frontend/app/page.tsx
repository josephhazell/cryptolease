"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { uploadJSONToPinata } from "@/lib/pinata";

async function loadABIs() {
  const [tenancy, vault, addrs] = await Promise.all([
    import("@/abi/TenancyIndexABI").catch(() => ({ TenancyIndexABI: { abi: [] } })),
    import("@/abi/RentVaultABI").catch(() => ({ RentVaultABI: { abi: [] } })),
    import("@/abi/DeployedAddresses").catch(() => ({ DeployedAddresses: {} }))
  ]);
  return { TenancyIndexABI: tenancy.TenancyIndexABI, RentVaultABI: vault.RentVaultABI, DeployedAddresses: addrs.DeployedAddresses } as const;
}

export default function Home() {
  const { provider, chainId, isConnected, connect, ethersSigner, ethersReadonlyProvider } = useMetaMaskEthersSigner();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({ provider, chainId, enabled: true });
  const { storage } = useInMemoryStorage();
  const [abis, setAbis] = useState<{ TenancyIndexABI: any; RentVaultABI: any; DeployedAddresses: Record<string, any> } | null>(null);

  useEffect(() => { loadABIs().then(setAbis); }, []);

  const deployed = useMemo(() => {
    if (!abis) return undefined;
    const entry = abis.DeployedAddresses?.[String(chainId ?? "")] || undefined;
    return entry as { chainId: number; TenancyIndex: `0x${string}`; RentVault: `0x${string}` } | undefined;
  }, [abis, chainId]);

  // State
  const [activeSection, setActiveSection] = useState<'create' | 'pay' | 'leases' | 'decrypt'>('leases');
  const [leaseForm, setLeaseForm] = useState({ tenant: "", rentAmount: "", token: "0x0000000000000000000000000000000000000000", periodSeconds: "720", startDate: "", endDate: "", leaseCID: "" });
  const [startLocal, setStartLocal] = useState<string>("");
  const [endLocal, setEndLocal] = useState<string>("");
  const [payForm, setPayForm] = useState({ leaseId: "", amount: "", receiptCID: "" });
  const [decryptForm, setDecryptForm] = useState({ receiptId: "" });
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [myLeasesLandlord, setMyLeasesLandlord] = useState<any[]>([]);
  const [myLeasesTenant, setMyLeasesTenant] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'landlord' | 'tenant'>('landlord');

  const canUseContracts = Boolean(isConnected && deployed && ethersSigner && ethersReadonlyProvider);

  const fmtLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setStartLocal(fmtLocal(now));
    setEndLocal(fmtLocal(end));
    setLeaseForm((p) => ({ ...p, startDate: String(Math.floor(now.getTime() / 1000)), endDate: String(Math.floor(end.getTime() / 1000)) }));
  }, []);

  async function refreshMyLeases() {
    if (!abis || !deployed || !ethersSigner || !ethersReadonlyProvider) return;
    try {
      const leaseCtr = new ethers.Contract(deployed.TenancyIndex, abis.TenancyIndexABI.abi, ethersReadonlyProvider);
      const me = await ethersSigner.getAddress();
      let lList: any[] = [];
      let tList: any[] = [];

      const normalize = (id: bigint, raw: any) => {
        const landlord = String(raw?.landlord ?? raw?.[1] ?? "0x");
        const tenant = String(raw?.tenant ?? raw?.[2] ?? "0x");
        const leaseCID = String(raw?.leaseCID ?? raw?.[3] ?? "");
        const rentAmount = BigInt(raw?.rentAmount ?? raw?.[4] ?? 0n);
        const token = String(raw?.token ?? raw?.[5] ?? "0x0000000000000000000000000000000000000000");
        const periodSeconds = BigInt(raw?.periodSeconds ?? raw?.[6] ?? 0n);
        const startDate = BigInt(raw?.startDate ?? raw?.[7] ?? 0n);
        const endDate = BigInt(raw?.endDate ?? raw?.[8] ?? 0n);
        const active = Boolean(raw?.active ?? raw?.[9] ?? false);
        return { leaseId: id, landlord, tenant, leaseCID, rentAmount, token, periodSeconds, startDate, endDate, active };
      };

      if (typeof leaseCtr.listTenanciesByHost === 'function' && typeof leaseCtr.listTenanciesByGuest === 'function') {
        const idsL: bigint[] = await leaseCtr.listTenanciesByHost(me);
        const idsT: bigint[] = await leaseCtr.listTenanciesByGuest(me);
        const toLease = async (id: bigint) => normalize(id, await leaseCtr.fetchTenancy(id));
        lList = await Promise.all(idsL.map(toLease));
        tList = await Promise.all(idsT.map(toLease));
      }

      setMyLeasesLandlord(lList);
      setMyLeasesTenant(tList);
    } catch (e) {
      setMessage(`❌ 获取租约失败：${(e as any)?.message || e}`);
    }
  }

  useEffect(() => { refreshMyLeases(); }, [abis, deployed, ethersSigner]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadedFile(file);
    try {
      setMessage("📤 正在上传到 IPFS...");
      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        tenant: leaseForm.tenant,
        rentAmount: leaseForm.rentAmount,
      };
      const cid = await uploadJSONToPinata(metadata, `lease-metadata-${Date.now()}`);
      setLeaseForm({ ...leaseForm, leaseCID: cid });
      setMessage(`✅ 已上传 IPFS: ${cid}`);
    } catch (error: any) {
      setMessage(`❌ 上传失败: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function createLease() {
    if (!canUseContracts || !abis) return;
    setLoading(true);
    try {
      const leaseCtr = new ethers.Contract(deployed!.TenancyIndex, abis.TenancyIndexABI.abi, ethersSigner!);
      setMessage("⏳ 正在创建租约...");
      const tx = await (leaseCtr.registerTenancy?.(
        leaseForm.tenant,
        leaseForm.leaseCID,
        ethers.parseUnits(leaseForm.rentAmount || "0", 18),
        leaseForm.token,
        BigInt((parseInt(leaseForm.periodSeconds || "0") * 60).toString()),
        BigInt(leaseForm.startDate || "0"),
        BigInt(leaseForm.endDate || "0")
      ) ?? leaseCtr.createLease(
        leaseForm.tenant,
        leaseForm.leaseCID,
        ethers.parseUnits(leaseForm.rentAmount || "0", 18),
        leaseForm.token,
        BigInt((parseInt(leaseForm.periodSeconds || "0") * 60).toString()),
        BigInt(leaseForm.startDate || "0"),
        BigInt(leaseForm.endDate || "0")
      ));
      setMessage("⏳ 等待确认...");
      await tx.wait();
      setMessage(`✅ 租约创建成功 TxHash: ${tx.hash.slice(0, 10)}...`);
      await refreshMyLeases();
    } catch (e: any) {
      setMessage(`❌ 创建失败: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function payRent() {
    if (!canUseContracts || !abis || !fhevmInstance) return;
    setLoading(true);
    try {
      const vaultCtr = new ethers.Contract(deployed!.RentVault, abis.RentVaultABI.abi, ethersSigner!);
      const leaseId = BigInt(payForm.leaseId);
      const amount = ethers.parseUnits(payForm.amount || "0", 18);
      
      setMessage("🔐 FHE 加密中...");
      const input = fhevmInstance.createEncryptedInput(deployed!.RentVault, ethersSigner!.address);
      input.add64(amount);
      const enc = await input.encrypt();
      
      setMessage("⏳ 发起支付...");
      const tx = await (vaultCtr.remitRent?.(leaseId, enc.handles[0], enc.inputProof, payForm.receiptCID, { value: amount })
        ?? vaultCtr.payRent(leaseId, enc.handles[0], enc.inputProof, payForm.receiptCID, { value: amount }));
      setMessage("⏳ 等待确认...");
      await tx.wait();
      setMessage(`✅ 支付成功 TxHash: ${tx.hash.slice(0, 10)}...`);
    } catch (e: any) {
      setMessage(`❌ 支付失败: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function decryptReceiptAmount() {
    if (!canUseContracts || !abis || !fhevmInstance || !ethersSigner) return;
    setLoading(true);
    try {
      // Use signer so eth_call carries `from` = current wallet; required for FHE handle authorization
      const vaultRead = new ethers.Contract(deployed!.RentVault, abis.RentVaultABI.abi, ethersSigner!);
      setMessage("🔍 获取加密句柄...");
      const handle = await (vaultRead.viewEncryptedAmount?.(BigInt(decryptForm.receiptId)) ?? vaultRead.getEncryptedAmount(BigInt(decryptForm.receiptId)));
      
      setMessage("🔐 生成解密签名...");
      const sig = await FhevmDecryptionSignature.loadOrSign(fhevmInstance, [deployed!.RentVault], ethersSigner, storage);
      if (!sig) { setMessage("❌ 无法生成签名"); setLoading(false); return; }
      
      setMessage("🔓 解密中...");
      const res = await fhevmInstance.userDecrypt(
        [{ handle, contractAddress: deployed!.RentVault }],
        sig.privateKey, sig.publicKey, sig.signature,
        sig.contractAddresses, sig.userAddress, sig.startTimestamp, sig.durationDays
      );
      const plain = (res as unknown as Record<string, bigint>)[String(handle)];
      setMessage(`✅ 解密成功: ${ethers.formatEther(plain)} ETH`);
    } catch (e: any) {
      setMessage(`❌ 解密失败: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-8 max-w-2xl">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-emerald-500 to-teal-400 rounded-3xl flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-transform">
              <svg className="w-16 h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase">
            CryptoLease Protocol
          </h2>
          <p className="text-xl text-gray-400 leading-relaxed">
            基于<span className="text-emerald-400 font-bold">全同态加密 (FHE)</span>的隐私租赁支付系统
            <br/>
            <span className="text-sm text-gray-500">零知识证明 • 链上隐私凭证 • 去中心化</span>
          </p>
          <button className="btn-primary text-xl px-12 py-5" onClick={connect}>
            <span className="flex items-center space-x-3">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1M9 12h12m-3-3l3 3-3 3" />
              </svg>
              <span>连接钱包启动</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!deployed) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="panel max-w-lg text-center space-y-5">
          <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-2xl flex items-center justify-center border-2 border-amber-500/50">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-amber-400 uppercase">合约未部署</h3>
          <p className="text-gray-400">
            当前网络（链 ID: <span className="text-emerald-400 font-mono">{chainId}</span>）上未找到 CryptoLease 合约
            <br/>
            <span className="text-sm">请切换到 Sepolia 测试网或本地开发网</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* LEFT SIDEBAR */}
      <aside className="col-span-12 lg:col-span-3">
        <div className="panel sticky top-24 space-y-3">
          <div className="mb-6">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Control Panel</h3>
            <div className="h-px bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
          </div>
          
          <button
            onClick={() => setActiveSection('leases')}
            className={`sidebar-item w-full ${activeSection === 'leases' ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-bold">我的租约</span>
          </button>

          <button
            onClick={() => setActiveSection('create')}
            className={`sidebar-item w-full ${activeSection === 'create' ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-bold">创建租约</span>
          </button>

          <button
            onClick={() => setActiveSection('pay')}
            className={`sidebar-item w-full ${activeSection === 'pay' ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold">支付租金</span>
          </button>

          <button
            onClick={() => setActiveSection('decrypt')}
            className={`sidebar-item w-full ${activeSection === 'decrypt' ? 'active' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="font-bold">解密收据</span>
          </button>

          {/* Status panel */}
          <div className="mt-8 p-4 bg-black/40 rounded-xl border border-emerald-500/20">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-3">System Status</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">FHEVM</span>
                <span className={`font-bold ${fhevmStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {fhevmStatus === 'ready' ? 'READY' : 'LOADING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Chain</span>
                <span className="text-emerald-400 font-mono text-xs">{chainId}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="col-span-12 lg:col-span-9 space-y-6">
        {/* Contract info banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-dark">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Tenancy Index</span>
            </div>
            <p className="text-sm font-mono text-gray-300 break-all">{deployed.TenancyIndex}</p>
          </div>
          <div className="card-dark">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-amber-400 uppercase tracking-widest font-bold">Rent Vault</span>
            </div>
            <p className="text-sm font-mono text-gray-300 break-all">{deployed.RentVault}</p>
          </div>
        </div>

        {/* Dynamic content based on active section */}
        {activeSection === 'leases' && (
          <div className="panel">
            <h2 className="section-title">我的租约合同</h2>
            
            <div className="flex items-center space-x-3 mb-6">
              <button
                className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${activeTab === 'landlord' ? 'bg-emerald-500 text-black shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('landlord')}
              >
                房东视角
              </button>
              <button
                className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${activeTab === 'tenant' ? 'bg-emerald-500 text-black shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('tenant')}
              >
                租客视角
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(activeTab === 'landlord' ? myLeasesLandlord : myLeasesTenant).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  暂无租约数据
                </div>
              )}
              {(activeTab === 'landlord' ? myLeasesLandlord : myLeasesTenant).map((l, idx) => (
                <div key={idx} className="card-dark hover:border-emerald-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Lease ID</span>
                      <p className="text-2xl font-black text-emerald-400">#{String(l.leaseId)}</p>
                    </div>
                    <span className={`badge ${l.active ? 'badge-success' : 'badge-warning'}`}>
                      {l.active ? 'ACTIVE' : 'CLOSED'}
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">租金</span>
                      <span className="font-mono text-emerald-400 font-bold">{ethers.formatEther(l.rentAmount || 0n)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">周期</span>
                      <span className="font-mono text-gray-300">{Number(l.periodSeconds || 0n)/60} 分钟</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">开始</span>
                      <span className="font-mono text-xs text-gray-400">{new Date(Number(l.startDate||0n)*1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">结束</span>
                      <span className="font-mono text-xs text-gray-400">{new Date(Number(l.endDate||0n)*1000).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {activeTab === 'tenant' && l.active && (
                    <button
                      className="btn-accent w-full mt-4"
                      onClick={() => {
                        setPayForm({ ...payForm, leaseId: String(l.leaseId), amount: ethers.formatEther(l.rentAmount || 0n) });
                        setActiveSection('pay');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      立即支付
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'create' && (
          <div className="panel">
            <h2 className="section-title">创建新租约</h2>
            <div className="space-y-5">
              <div>
                <label className="label">租客钱包地址</label>
                <input className="input-field" placeholder="0x..." value={leaseForm.tenant} onChange={(e) => setLeaseForm({ ...leaseForm, tenant: e.target.value })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">租金金额 (ETH)</label>
                  <input className="input-field" type="number" step="0.001" placeholder="0.1" value={leaseForm.rentAmount} onChange={(e) => setLeaseForm({ ...leaseForm, rentAmount: e.target.value })} />
                </div>
                <div>
                  <label className="label">支付周期 (分钟)</label>
                  <input className="input-field" type="number" placeholder="720" value={leaseForm.periodSeconds} onChange={(e) => setLeaseForm({ ...leaseForm, periodSeconds: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">开始时间</label>
                  <input className="input-field" type="datetime-local" value={startLocal} onChange={(e) => { setStartLocal(e.target.value); setLeaseForm({ ...leaseForm, startDate: String(Math.floor(new Date(e.target.value).getTime() / 1000)) }); }} />
                </div>
                <div>
                  <label className="label">结束时间</label>
                  <input className="input-field" type="datetime-local" value={endLocal} onChange={(e) => { setEndLocal(e.target.value); setLeaseForm({ ...leaseForm, endDate: String(Math.floor(new Date(e.target.value).getTime() / 1000)) }); }} />
                </div>
              </div>

              <div>
                <label className="label">租约元数据 (IPFS)</label>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-emerald-500/30 rounded-2xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-500/5 transition-all">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploadedFile ? (
                      <div className="text-center">
                        <p className="text-emerald-400 font-bold">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-emerald-400 font-bold">点击上传文件</p>
                        <p className="text-xs text-gray-500">支持 PDF、JSON、图片等</p>
                      </div>
                    )}
                  </div>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {leaseForm.leaseCID && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-xs text-emerald-400 font-bold mb-1">IPFS CID:</p>
                    <p className="text-xs font-mono text-emerald-300 break-all">{leaseForm.leaseCID}</p>
                  </div>
                )}
              </div>

              <button className="btn-primary w-full" onClick={createLease} disabled={!canUseContracts || loading || uploading}>
                {loading ? "处理中..." : uploading ? "上传中..." : "创建租约合同"}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'pay' && (
          <div className="panel">
            <h2 className="section-title">支付租金 (FHE 加密)</h2>
            <div className="space-y-5">
              <div>
                <label className="label">租约 ID</label>
                <input className="input-field" type="number" placeholder="1" value={payForm.leaseId} onChange={(e) => setPayForm({ ...payForm, leaseId: e.target.value })} />
              </div>
              <div>
                <label className="label">支付金额 (ETH)</label>
                <input className="input-field" type="number" step="0.001" placeholder="0.1" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">收据 CID (可选)</label>
                <input className="input-field" placeholder="Qm..." value={payForm.receiptCID} onChange={(e) => setPayForm({ ...payForm, receiptCID: e.target.value })} />
              </div>
              <button className="btn-primary w-full" onClick={payRent} disabled={!canUseContracts || fhevmStatus !== 'ready' || loading}>
                {loading ? "处理中..." : "🔐 FHE 加密并支付"}
              </button>
              <p className="text-center text-xs text-gray-500">
                💡 支付金额将使用全同态加密 (FHE) 后上链
              </p>
            </div>
          </div>
        )}

        {activeSection === 'decrypt' && (
          <div className="panel">
            <h2 className="section-title">解密收据金额</h2>
            <div className="space-y-5">
              <div>
                <label className="label">收据 ID</label>
                <input className="input-field" type="number" placeholder="1" value={decryptForm.receiptId} onChange={(e) => setDecryptForm({ receiptId: e.target.value })} />
              </div>
              <button className="btn-primary w-full" onClick={decryptReceiptAmount} disabled={fhevmStatus !== 'ready' || loading || !decryptForm.receiptId}>
                {loading ? "解密中..." : "🔓 解密查看"}
              </button>
            </div>
          </div>
        )}

        {/* Status message */}
        {message && (
          <div className={`p-5 rounded-2xl border-2 ${message.startsWith("✅") ? "bg-emerald-500/10 border-emerald-500/50" : message.startsWith("❌") ? "bg-red-500/10 border-red-500/50" : "bg-amber-500/10 border-amber-500/50"}`}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {message.startsWith("✅") ? (
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : message.startsWith("❌") ? (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <p className="text-sm font-medium flex-1 break-all">{message}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
