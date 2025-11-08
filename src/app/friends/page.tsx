"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Friend = { id: string; name?: string; email?: string };
type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status?: string;
  user?: { id: string; name?: string; email?: string };
};

export default function FriendsPage() {
  const [emailQuery, setEmailQuery] = useState("");
  const [foundUser, setFoundUser] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      const customerId = localStorage.getItem("customerId");
      setSignedIn(Boolean(token || customerId));
    } catch {
      setSignedIn(false);
    }
  }, []);

  useEffect(() => {
    const reloadLists = async () => {
      setError(null);
      setMessage(null);
      try {
        const base =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
        const userId = localStorage.getItem("customerId");
        if (!userId) return;
        const token = localStorage.getItem("accessToken");
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const [fRes, rRecv, rSent] = await Promise.all([
          fetch(`${base}/friendship/friends/${userId}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${base}/friendship/requests/${userId}/received`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${base}/friendship/requests/${userId}/sent`, {
            headers,
            cache: "no-store",
          }),
        ]);
        if (fRes.ok) {
          const data = await fRes.json().catch(() => []);
          setFriends(
            Array.isArray(data)
              ? data
              : Array.isArray(data?.friends)
              ? data.friends
              : []
          );
        }
        if (rRecv.ok) {
          const data = await rRecv.json().catch(() => []);
          setReceived(
            Array.isArray(data)
              ? data
              : Array.isArray(data?.requests)
              ? data.requests
              : []
          );
        }
        if (rSent.ok) {
          const data = await rSent.json().catch(() => []);
          setSent(
            Array.isArray(data)
              ? data
              : Array.isArray(data?.requests)
              ? data.requests
              : []
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load friends";
        setError(msg);
      }
    };
    // expose for reuse in handlers
    (window as any).__friendsReload = reloadLists;
    if (signedIn) reloadLists();
  }, [signedIn]);

  // Do not fetch other customers by ID (backend restricted). Rely on data returned by friendship endpoints.

  async function searchByEmail() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setFoundUser(null);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
      const userId = localStorage.getItem("customerId");
      if (!userId) throw new Error("Missing current user id");
      const res = await fetch(`${base}/friendship/search/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailQuery }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "User not found");
      }
      const data = await res.json();
      const u = data?.user || data;
      if (u?.id) {
        setFoundUser({ id: String(u.id), name: u.name, email: u.email });
      } else {
        setMessage("No user found for that email.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
      const userId = localStorage.getItem("customerId");
      if (!userId) throw new Error("Missing current user id");
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${base}/friendship/request/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: foundUser?.email || emailQuery }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Request failed (${res.status})`);
      }
      setMessage("Friend request sent.");
      setEmailQuery("");
      try {
        if ((window as any).__friendsReload) {
          await (window as any).__friendsReload();
        }
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send request";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function respondRequest(requestId: string, accept: boolean) {
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
      const userId = localStorage.getItem("customerId");
      if (!userId) throw new Error("Missing current user id");
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${base}/friendship/respond/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId, accept }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Respond failed (${res.status})`);
      }
      try {
        if ((window as any).__friendsReload) {
          await (window as any).__friendsReload();
        }
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not respond";
      setError(msg);
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-6 text-left">
        <h1 className="text-2xl font-semibold">Friends</h1>
        {!signedIn && (
          <div className="text-sm text-muted-foreground">
            Please sign in to manage friends.
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Find Friend by Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="friend@example.com"
                value={emailQuery}
                onChange={(e) => {
                  setEmailQuery(e.target.value);
                  setMessage(null);
                  setFoundUser(null);
                }}
                disabled={!signedIn}
              />
              <Button
                onClick={searchByEmail}
                disabled={!signedIn || !emailQuery || loading}
              >
                {loading ? "Searching…" : "Search"}
              </Button>
            </div>
            {foundUser && (
              <div className="flex items-center justify-between text-sm">
                <div>
                  {foundUser.name || foundUser.email || foundUser.id}
                  {foundUser.email ? ` (${foundUser.email})` : ""}
                </div>
                <Button onClick={sendRequest}>Add Friend</Button>
              </div>
            )}
          </CardContent>
        </Card>
        {message && (
          <div className="text-sm text-muted-foreground">{message}</div>
        )}
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="space-y-3">
          {!!received.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incoming Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {received.map((r) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="text-sm">
                      {`From: ${r["user"]?.name || r.fromUserId}${
                        r["user"]?.email ? ` (${r["user"]?.email})` : ""
                      }`}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => respondRequest(r.id, true)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => respondRequest(r.id, false)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {!!sent.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sent Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sent.map((r) => (
                  <div key={r.id} className="text-sm">
                    {`To: ${r["user"]?.name || r.toUserId}${
                      r["user"]?.email ? ` (${r["user"]?.email})` : ""
                    } — ${r.status || "pending"}`}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Friends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {friends.length ? (
                friends.map((f) => (
                  <div key={f.id} className="text-sm">
                    {`${f.name || f.id}${f.email ? ` (${f.email})` : ""}`}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No friends yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
