import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-sm">
      <nav className="flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="MeetUpBuddy Logo"
            width={80}
            height={80}
            priority
            className="rounded-md"
          />
          <span className="text-xl font-bold tracking-tight text-foreground font-chewy">
            MeetUpBuddy
          </span>
        </Link>

        <div className="space-x-2 font-chewy">
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
          <Link href="/availability">
            <Button variant="ghost">Availability</Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost">Profile</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
