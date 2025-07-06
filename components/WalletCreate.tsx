"use client";
import React, { useEffect, useState } from "react";
// import { Button, Input } from "@/components/ui"; // daisyUI button and input assumed

import { toast } from "sonner";
import nacl from "tweetnacl";
import { AuroraText } from "@/components/magicui/aurora-text";

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Connection, PublicKey, clusterApiUrl, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { ethers } from "ethers";
import { Eye, EyeOff, Trash2, Copy, PlusCircle } from "lucide-react";

interface Wallet {
    publicKey: string;
    privateKey: string;
    mnemonic: string;
    path: string;
}


const pathTypeNames: Record<string, string> = {
    "501": "Solana",
    "60": "Ethereum",
};

export default function WalletGenerator() {
    const [pathType, setPathType] = useState<string>("");
    const [mnemonic, setMnemonic] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [visibleKeys, setVisibleKeys] = useState<boolean[]>([]);
    const [balances, setBalances] = useState<string[]>([]);
    useEffect(() => {
        const saved = localStorage.getItem("wallets");
        if (saved) {
            const loaded = JSON.parse(saved);
            setWallets(loaded);
            setVisibleKeys(new Array(loaded.length).fill(false));
        }
    }, []);
    const getEthereumBalance = async (publicKeyString: string) => {
        const res = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${publicKeyString}&tag=latest&apikey=FUZX722W2BATSZN2F9I3FVUPSGWKWSH495`);
        const data = await res.json();
        const eth = Number(data.result) / 1e18;
        return eth.toFixed(4);
    };
    const getSolanaBalance = async (publicKeyString: string) => {
        const connection = new Connection("https://api.devnet.solana.com");
        const publicKey = new PublicKey(publicKeyString);
        const lamports = await connection.getBalance(publicKey);
        const sol = lamports / 1e9;
        return sol;
    };

    useEffect(() => {
        const fetchBalances = async () => {
            const results = await Promise.all(
                wallets.map(async (wallet) => {
                    const coinType = wallet.path.split("/")[2].replace("'", ""); // "501" or "60"

                    try {
                        if (coinType === "501") {
                            return (await getSolanaBalance(wallet.publicKey)) + " SOL";
                        } else if (coinType === "60") {
                            return (await getEthereumBalance(wallet.publicKey)).slice(0, 8) + " ETH";
                        } else {
                            return "Unknown";
                        }
                    } catch (err) {
                        console.error("Balance fetch error:", err);
                        return "Error";
                    }
                })
            );
            setBalances(results);
        };
        if (wallets.length > 0) fetchBalances();
        localStorage.setItem("wallets", JSON.stringify(wallets));
    }, [wallets, pathType]);

    const generateWallet = (index: number): Wallet | null => {
        try {
            const seed = mnemonicToSeedSync(mnemonic);
            const path = `m/44'/${pathType}'/0'/${index}'`;
            const { key } = derivePath(path, seed.toString("hex"));

            if (pathType === "501") {
                const { secretKey } = nacl.sign.keyPair.fromSeed(key);
                const kp = Keypair.fromSecretKey(secretKey);
                return {
                    publicKey: kp.publicKey.toBase58(),
                    privateKey: bs58.encode(secretKey),
                    mnemonic,
                    path,
                };
            }

            if (pathType === "60") {
                const pk = Buffer.from(key).toString("hex");
                const wallet = new ethers.Wallet(pk);
                return {
                    publicKey: wallet.address,
                    privateKey: pk,
                    mnemonic,
                    path,
                };
            }

            toast.error("Invalid path type.");
            return null;
        } catch {
            toast.error("Wallet generation failed.");
            return null;
        }
    };

    const handleGenerate = () => {
        if (!pathType) return toast.error("Select blockchain first.");
        const m = mnemonic || generateMnemonic();
        if (!validateMnemonic(m)) return toast.error("Invalid mnemonic.");

        setMnemonic(m);
        const newWallet = generateWallet(wallets.length);
        if (newWallet) {
            setWallets([...wallets, newWallet]);
            setVisibleKeys([...visibleKeys, false]);
            toast.success("Wallet created.");
        }
    };

    const deleteWallet = (i: number) => {
        const updated = wallets.filter((_, idx) => idx !== i);
        setWallets(updated);
        setVisibleKeys(updated.map(() => false));
        toast.success("Wallet deleted.");
    };

    return (
        <>
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100 bg-opacity-80">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            )}

            <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
                <div className="p-6 max-w-6xl mx-auto">
                    {/* Blockchain Selection */}
                    {!pathType && (
                        <div className="flex flex-col items-center gap-4 md:mt-20">
                            <h2 className="md:text-[65px] text-4xl font-bold md:my-20 my-10">Create <AuroraText>Blockchain Wallet</AuroraText>  </h2>

                            <h2 className="md:text-4xl text-2xl font-bold">Select Blockchain</h2>
                            <div className="flex gap-4">
                                <button className="btn btn-accent text-white btn-lg" onClick={() => setPathType("501")}>Solana</button>
                                <button className="btn btn-lg bg-gray-400 text-black" onClick={() => setPathType("60")}>Ethereum</button>
                            </div>
                        </div>
                    )}

                    {/* Mnemonic Input & Generate */}
                    {pathType && (
                        <div className="my-6 md:my-20 flex flex-col gap-4 md:max-w-[30vw] mx-auto ">
                            <input
                                type="text"
                                placeholder="Enter mnemonic or leave blank"
                                value={mnemonic}
                                onChange={(e: any) => setMnemonic(e.target.value)}
                                className="input input-bordered w-full"
                            />
                            <button className="btn btn-lg btn-primary" onClick={handleGenerate}>
                                <PlusCircle className="w-4 h-4 mr-2" />
                                {mnemonic ? "Import Wallet" : "Generate Wallet"}
                            </button>
                        </div>
                    )}
                    {/* recovery phase */}
                    {mnemonic && (
                        <div className="bg-base-200 p-4 rounded-lg max-w-[60vw] mx-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {mnemonic.split(" ").map((word, index) => (
                                    <button
                                        key={index}
                                        className="btn btn-lg btn-outline w-full"
                                        onClick={() => {
                                            navigator.clipboard.writeText(word);
                                            toast.success(`Word "${word}" copied!`);
                                        }}
                                    >
                                        <span className="font-mono">{word}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                className="mt-4 btn btn-primary btn-md w-full"
                                onClick={() => {
                                    navigator.clipboard.writeText(mnemonic);
                                    toast.success("Entire mnemonic copied!");
                                }}
                            >
                                Copy Full Mnemonic
                            </button>
                        </div>
                    )}


                    {/* Wallet List */}
                    {wallets.length > 0 && (
                        <div className="mt-8 card bg-base-100">
                            <h3 className="text-xl font-semibold mb-4">
                                {pathTypeNames[pathType]} Wallets
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2">
                                {wallets.map((w, i) => (
                                    <div
                                        key={i}
                                        className=" p-4 rounded-lg bg-base-100 shadow-xl hover:shadow-2xl duration-200 ease-in-out space-y-4"
                                    >
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-lg font-bold">Wallet #{i + 1}</h4>
                                            <button className="text-red-500 cursor-pointer" onClick={() => {
                                                const modal = document.getElementById('my_modal_5') as HTMLDialogElement | null;
                                                if (modal) modal.showModal();
                                            }}>
                                                <Trash2 />
                                            </button>
                                            <dialog id="my_modal_5" className="modal modal-bottom sm:modal-middle">
                                                <div className="modal-box">
                                                    <h3 className="font-bold text-lg">
                                                        Are you sure you want to delete this wallet?</h3>
                                                    <p className="py-4">This action cannot be undone. This will permanently delete your wallets and keys from local storage.</p>
                                                    <div className="modal-action">

                                                        <form method="dialog">
                                                            {/* if there is a button in form, it will close the modal */}
                                                            <button
                                                                onClick={() => deleteWallet(i)}
                                                                className="btn btn-error cursor-pointer text-white"
                                                            >
                                                                Delete
                                                            </button>
                                                            <button className="btn">Close</button>
                                                        </form>
                                                    </div>
                                                </div>
                                            </dialog>
                                            {/* <button
                                        onClick={() => deleteWallet(i)}
                                        className="text-red-500 hover:text-red-700 cursor-pointer"
                                    >
                                        <Trash2 />
                                    </button> */}
                                        </div>
                                        <p className="text-sm text-primary/60">
                                            Balance: {balances[i] || "Loading..."}
                                        </p>
                                        <div>
                                            <label className="font-semibold">Public Key</label>
                                            <p
                                                onClick={() => {
                                                    navigator.clipboard.writeText(w.publicKey);
                                                    toast.success("Copied!");
                                                }}
                                                className="truncate cursor-pointer text-sm hover:underline"
                                            >
                                                {w.publicKey}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="font-semibold">Private Key</label>
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm cursor-pointer w-full" onClick={() => {
                                                    navigator.clipboard.writeText(w.privateKey);
                                                    toast.success("Copied!");
                                                }}>
                                                    {visibleKeys[i] ? w.privateKey : "•".repeat(30)}
                                                </p>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() =>
                                                        setVisibleKeys((vis) =>
                                                            vis.map((v, idx) => (idx === i ? !v : v))
                                                        )
                                                    }
                                                >
                                                    {visibleKeys[i] ? <EyeOff /> : <Eye />}
                                                </button>

                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                    }
                </div >
            </div>
        </>

    );
}
