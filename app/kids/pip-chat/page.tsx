import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function PipChatPage() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-md">
      <span className="text-6xl">🦉</span>
      <h1 className="mt-4 font-kids-display text-2xl font-bold">Pip Chat</h1>
      <p className="mt-2 text-slate-600">
        Pip your AI reading buddy is coming soon! For now, keep reading and earning XP.
      </p>
      <Link href="/kids/shelf" className="mt-6 inline-block">
        <Button variant="kids">Go to My Shelf</Button>
      </Link>
    </div>
  );
}
