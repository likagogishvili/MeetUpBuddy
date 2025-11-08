// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Customer = {
  id: string;
  name: string;
  lastName: string;
  age: number;
  email?: string;
};

export default function ProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingId, setMissingId] = useState(false);

  useEffect(() => {
    const storedId = (() => {
      try {
        return localStorage.getItem("customerId");
      } catch {
        return null;
      }
    })();
    if (!storedId) {
      setMissingId(true);
      return;
    }
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
        const res = await fetch(`${base}/customer/${storedId}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || `Failed to load profile (${res.status})`);
        }
        const data = (await res.json()) as Customer;
        setCustomer(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <h1 className="text-2xl font-semibold">My Profile</h1>

        {missingId && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              No customer ID found. Please register or sign in first.
            </div>
            <div className="flex gap-2 justify-center">
              <Link href="/register">
                <Button>Register</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        )}

        {loading && <div>Loading profile…</div>}
        {error && <div className="text-destructive">{error}</div>}

        {customer && !loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>
                {customer.name} {customer.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-left">
              <div><span className="font-medium">Customer ID:</span> {customer.id}</div>
              {customer.email && (
                <div><span className="font-medium">Email:</span> {customer.email}</div>
              )}
              <div><span className="font-medium">Age:</span> {customer.age}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
