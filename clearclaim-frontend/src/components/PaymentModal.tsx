import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, QrCode, Wallet, CheckCircle, ShieldCheck, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

export interface PlanData {
  planId: number;
  planName: string;
  premiumAmount: number;
  coverageAmount: number;
}

interface PaymentModalProps {
  plan: PlanData | null;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = "card" | "upi" | "crypto";

export default function PaymentModal({ plan, onClose, onSuccess }: PaymentModalProps) {
  const { walletAddress, userId } = useSelector((state: RootState) => state.auth);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cryptoRate, setCryptoRate] = useState(0);

  useEffect(() => {
    // Demo exchange rate: 1 OKB ≈ ₹4,200 (X Layer native token)
    if (plan) {
      setCryptoRate(plan.premiumAmount / 4200);
    }
  }, [plan]);

  if (!plan) return null;

  const handlePay = async () => {
    setLoading(true);

    if (method === "crypto" && walletAddress) {
      try {
        if (typeof window !== "undefined" && (window as any).okxwallet) {
          const okxWallet = (window as any).okxwallet;
          
          // Ensure wallet is on X Layer Testnet (Chain ID 1952 = 0x7a0)
          const currentChainId = await okxWallet.request({ method: 'eth_chainId' });
          if (currentChainId !== '0x7a0') {
            try {
              await okxWallet.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a0' }],
              });
            } catch (switchError: any) {
              // This error code indicates that the chain has not been added to the wallet.
              if (switchError.code === 4902) {
              await okxWallet.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x7a0',
                    chainName: 'X Layer Testnet',
                    rpcUrls: ['https://testrpc.xlayer.tech'],
                    nativeCurrency: {
                      name: 'OKB',
                      symbol: 'OKB',
                      decimals: 18,
                    },
                    blockExplorerUrls: ['https://www.oklink.com/xlayer-test'],
                  },
                ],
              });
              // Give the wallet extension a moment to process the added chain
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Verify the chain was added and switched
              const newChainId = await okxWallet.request({ method: 'eth_chainId' });
              if (newChainId !== '0x7a0') {
                  throw new Error("Please switch your wallet to the X Layer Testnet to continue.");
              }
              } else {
                throw switchError;
              }
            }
          }
          
          // Small delay before popping the transaction window to prevent wallet UI freeze
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Craft payload for payPremium(uint256,uint256) -> 0xf076b4f0
          const planIdHex = plan.planId.toString(16).padStart(64, '0');
          const customerIdHex = (userId || 0).toString(16).padStart(64, '0');
          const dataPayload = "0xf076b4f0" + planIdHex + customerIdHex;

          // Send 0.001 native token to PremiumVault contract
          const txHash = await okxWallet.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: walletAddress,
                to: "0x7Dc16253b0CaDE34e4562608d0929224175175B4", // PremiumVault
                value: "0x38d7ea4c68000", 
                data: dataPayload
              },
            ],
          });
          console.log("Tx signed and sent to PremiumVault!", txHash);
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            onSuccess();
          }, 1500);
        } else {
          alert("OKX Wallet not detected.");
        }
      } catch (err: any) {
        console.error(err);
        alert(err?.message || "Transaction failed or rejected.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Simulate Web2 payment processing
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 1500);
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)"
          }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-indigo-400" /> Secure Checkout
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-sm text-slate-400 mb-1">Purchasing Plan</p>
              <h3 className="text-lg font-bold text-white mb-2">{plan.planName}</h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Premium</span>
                <span className="font-bold text-indigo-400 text-lg">₹{plan.premiumAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMethod("card")}
                className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-2 transition-all border ${
                  method === "card" ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <CreditCard size={20} />
                <span className="text-xs font-semibold">Card</span>
              </button>
              <button
                onClick={() => setMethod("upi")}
                className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-2 transition-all border ${
                  method === "upi" ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <QrCode size={20} />
                <span className="text-xs font-semibold">UPI</span>
              </button>
              <button
                onClick={() => setMethod("crypto")}
                className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-2 transition-all border ${
                  method === "crypto" ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <Wallet size={20} />
                <span className="text-xs font-semibold">Web3</span>
              </button>
            </div>

            {/* Method Forms */}
            <div className="mb-8 min-h-[140px]">
              {method === "card" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Card Number</label>
                    <input type="text" placeholder="4111 1111 1111 1111" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Expiry</label>
                      <input type="text" placeholder="MM/YY" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">CVV</label>
                      <input type="password" placeholder="•••" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500/50" />
                    </div>
                  </div>
                </motion.div>
              )}

              {method === "upi" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-4">
                  <div className="w-32 h-32 bg-white rounded-xl p-2 mb-4">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=clearclaim@okaxis%26pn=ClearClaim%26am=1.00" alt="UPI QR" className="w-full h-full opacity-80" />
                  </div>
                  <p className="text-sm text-slate-400">Scan to pay securely via UPI</p>
                </motion.div>
              )}

              {method === "crypto" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 inline-block mb-2">
                    <Wallet className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">~ {cryptoRate.toFixed(2)} OKB</p>
                    <p className="text-xs text-slate-400">Network: X Layer Testnet</p>
                  </div>
                  {walletAddress ? (
                    <p className="text-xs text-emerald-400">Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                  ) : (
                    <p className="text-xs text-amber-400">Please connect OKX Wallet first in the dashboard.</p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Pay Button */}
            {success ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400 p-3 rounded-xl border border-emerald-500/30 font-bold">
                <CheckCircle /> Payment Successful
              </motion.div>
            ) : (
              <button
                onClick={handlePay}
                disabled={loading || (method === "crypto" && !walletAddress)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : null}
                {loading ? "Processing..." : `Pay ₹${plan.premiumAmount.toLocaleString()}`}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
