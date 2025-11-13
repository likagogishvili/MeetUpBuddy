"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Friend = { id: string; name?: string; email?: string };
type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status?: string;
  user?: { id: string; name?: string; email?: string };
};
type EventRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  eventData: {
    title: string;
    description: string;
    date: string;
  };
  status: string;
  createdAt: string;
  fromUser?: { id: string; name?: string; email?: string };
};

export default function FriendsPage() {
  const [emailQuery, setEmailQuery] = useState("");
  const [foundUser, setFoundUser] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedFriendForEvent, setSelectedFriendForEvent] = useState<Friend | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");

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
        const [fRes, rRecv, rSent, eRecv] = await Promise.all([
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
          fetch(`${base}/friendship/event-requests/${userId}/received`, {
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
        if (eRecv.ok) {
          const data = await eRecv.json().catch(() => ({}));
          setEventRequests(
            Array.isArray(data?.requests) ? data.requests : []
          );
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load friends";
        setError(msg);
      }
    };
    // expose for reuse in handlers
    if (typeof window !== 'undefined') {
      (window as Window & { __friendsReload?: () => Promise<void> }).__friendsReload = reloadLists;
    }
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
        const reload = (window as Window & { __friendsReload?: () => Promise<void> }).__friendsReload;
        if (reload) {
          await reload();
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
        const reload = (window as Window & { __friendsReload?: () => Promise<void> }).__friendsReload;
        if (reload) {
          await reload();
        }
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not respond";
      setError(msg);
    }
  }

  async function sendEventRequest(friend: Friend) {
    if (!eventTitle || !eventDate || !friend.email) {
      setError("Please fill in all required fields");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
      const userId = localStorage.getItem("customerId");
      if (!userId) throw new Error("Missing current user id");
      const token = localStorage.getItem("accessToken");
      
      // Convert datetime-local format to ISO string
      const dateToSend = new Date(eventDate).toISOString();
      
      const res = await fetch(`${base}/friendship/request-event/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: friend.email,
          title: eventTitle,
          description: eventDescription,
          date: dateToSend,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Event request failed (${res.status})`);
      }
      const data = await res.json();
      if (data.availability && !data.availability.isAvailable) {
        setError(data.message || "Friend is not available on this date");
        setMessage(data.suggestion || "Please choose a different date");
      } else {
        setMessage("Event request sent successfully!");
        setEventDialogOpen(false);
        setEventTitle("");
        setEventDescription("");
        setEventDate("");
        setSelectedFriendForEvent(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send event request";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function openEventDialog(friend: Friend) {
    setSelectedFriendForEvent(friend);
    setEventDialogOpen(true);
    setError(null);
    setMessage(null);
  }

  async function respondToEventRequest(requestId: string, accept: boolean) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
      const userId = localStorage.getItem("customerId");
      if (!userId) throw new Error("Missing current user id");
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${base}/friendship/respond-event/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId, accept }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || `Response failed (${res.status})`);
      }
      await res.json();
      setMessage(accept ? "Event request accepted! Event added to both calendars." : "Event request declined.");
      // Reload event requests
      try {
        const reload = (window as Window & { __friendsReload?: () => Promise<void> }).__friendsReload;
        if (reload) {
          await reload();
        }
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not respond to event request";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
        </div>

        {!signedIn && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Sign In Required</h3>
                <p className="text-sm text-muted-foreground">
                  Please sign in to manage your friends and event requests.
                </p>
          </div>
            </CardContent>
          </Card>
        )}

        {signedIn && (
          <>
            {/* Search Friend Card */}
            <Card className="shadow-md">
          <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Find Friend by Email
                </CardTitle>
          </CardHeader>
              <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="friend@example.com"
                value={emailQuery}
                onChange={(e) => {
                  setEmailQuery(e.target.value);
                  setMessage(null);
                  setFoundUser(null);
                }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && emailQuery && !loading) {
                        searchByEmail();
                      }
                    }}
                    className="flex-1"
              />
              <Button
                onClick={searchByEmail}
                    disabled={!emailQuery || loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Searching…
                      </>
                    ) : (
                      "Search"
                    )}
              </Button>
            </div>
            {foundUser && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {getInitials(foundUser.name, foundUser.email)}
                      </div>
                <div>
                        <p className="font-semibold">
                          {foundUser.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {foundUser.email || foundUser.id}
                        </p>
                      </div>
                </div>
                    <Button onClick={sendRequest} disabled={loading}>
                      Add Friend
                    </Button>
              </div>
            )}
          </CardContent>
        </Card>

            {/* Messages */}
        {message && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {message}
                  </p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-destructive mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Incoming Friend Requests */}
              {received.length > 0 && (
                <Card className="shadow-md">
              <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {received.length}
                      </span>
                      Incoming Requests
                    </CardTitle>
              </CardHeader>
                  <CardContent className="space-y-3">
                {received.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            {getInitials(
                              r["user"]?.name,
                              r["user"]?.email
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {r["user"]?.name || r.fromUserId}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r["user"]?.email || ""}
                            </p>
                          </div>
                    </div>
                        <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                            size="sm"
                        onClick={() => respondRequest(r.id, true)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                            size="sm"
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

              {/* Sent Friend Requests */}
              {sent.length > 0 && (
                <Card className="shadow-md">
              <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                        {sent.length}
                      </span>
                      Sent Requests
                    </CardTitle>
              </CardHeader>
                  <CardContent className="space-y-3">
                {sent.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                          {getInitials(r["user"]?.name, r["user"]?.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {r["user"]?.name || r.toUserId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r["user"]?.email || ""} •{" "}
                            <span className="capitalize">
                              {r.status || "pending"}
                            </span>
                          </p>
                        </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
            </div>

            {/* Friends List */}
            <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  My Friends
                  {friends.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({friends.length})
                    </span>
                  )}
                </CardTitle>
            </CardHeader>
              <CardContent>
                {friends.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {friends.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-base font-bold text-primary-foreground flex-shrink-0 shadow-md">
                            {getInitials(f.name, f.email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">
                              {f.name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {f.email || f.id}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEventDialog(f)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Event
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold">No Friends Yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Start by searching for friends by email above.
                      </p>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>

            {/* Event Request Dialog */}
            <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Request Event with {selectedFriendForEvent?.name || selectedFriendForEvent?.email}
                  </DialogTitle>
                  <DialogDescription>
                    Send a calendar event request to your friend. The system will check their availability.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Event Title *</Label>
                    <Input
                      id="event-title"
                      placeholder="Coffee meetup"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-date">Date *</Label>
                    <Input
                      id="event-date"
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      placeholder="Let's meet for coffee..."
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEventDialogOpen(false);
                      setEventTitle("");
                      setEventDescription("");
                      setEventDate("");
                      setSelectedFriendForEvent(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => selectedFriendForEvent && sendEventRequest(selectedFriendForEvent)}
                    disabled={!eventTitle || !eventDate || loading}
                  >
                    {loading ? "Sending..." : "Send Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Event Requests Section */}
            {eventRequests.length > 0 && (
              <Card className="shadow-md border-primary/20">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Event Requests
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {eventRequests.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {eventRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {getInitials(
                                req.fromUser?.name,
                                req.fromUser?.email
                              )}
                            </div>
                            <p className="font-semibold">
                              {req.fromUser?.name || req.fromUserId}
                            </p>
                          </div>
                          <h4 className="font-semibold text-lg mb-1">
                            {req.eventData.title}
                          </h4>
                          {req.eventData.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {req.eventData.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {new Date(req.eventData.date).toLocaleString()}
                            </span>
                            <span className="capitalize px-2 py-0.5 rounded bg-muted">
                              {req.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToEventRequest(req.id, true)}
                            disabled={loading}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => respondToEventRequest(req.id, false)}
                            disabled={loading}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
