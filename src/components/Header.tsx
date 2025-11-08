"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const compute = () => {
      try {
        const token = localStorage.getItem("accessToken");
        const customerId = localStorage.getItem("customerId");
        setSignedIn(Boolean(token || customerId));
      } catch {
        setSignedIn(false);
      }
    };
    compute();
    const onStorage = () => compute();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
          {/* <Link href="/availability">
            <Button variant="ghost">Availability</Button>
          </Link> */}
          {signedIn ? (
            <>
              <Link href="/profile">
                <Button variant="ghost">Profile</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("customerId");
                  } catch {}
                  setSignedIn(false);
                  router.push("/");
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline">Sign In</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
