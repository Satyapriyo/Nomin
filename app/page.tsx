import Navbar from "@/components/Navbar";
import WalletCreate from "@/components/WalletCreate";
import { Toaster } from "sonner";



export default function Home() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <Navbar />
      <WalletCreate />
      <Toaster />
    </div>
  );
}
