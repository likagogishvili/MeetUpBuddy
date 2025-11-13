"use client";
import MyCalendar from "@/components/Calendar";
import FormFields from "@/components/Form";
import Layout from "@/components/Layout";
import { dummyData } from "@/data/dummyData";
import { Event } from "@/types/calendarTypes";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function Home() {
  const [events, setEvents] = useState<Event[]>([...dummyData]);
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      const customerId = localStorage.getItem("customerId");
      setSignedIn(Boolean(token || customerId));
    } catch {
      setSignedIn(false);
    }
  }, []);

  const handleAddEvent = (event: Event) => {
    setEvents((prev) => [...prev, event]);
  };
  useEffect(() => {
    if (loadedRemote) return;
    const fetchEvents = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
        let customerId: string | null = null;
        let token: string | null = null;
        try {
          customerId = localStorage.getItem("customerId");
          token = localStorage.getItem("accessToken");
        } catch {}

        // Only fetch from API if signed in (token or customerId)
        const isSignedIn = Boolean(token || customerId);
        if (!isSignedIn) {
          setLoadedRemote(true);
          return;
        }

        // Prefer customer-scoped notes when we have an id
        const url = customerId
          ? `${base}/customer/${customerId}/notes`
          : `${base}/note`;
        const parseAsCustomerNotes = Boolean(customerId);

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          setLoadedRemote(true);
          return;
        }
        const data = await res.json();

        const backendEvents: Event[] = (() => {
          const list = parseAsCustomerNotes ? data?.notes : data?.events;
          if (!Array.isArray(list)) return [];
          return list
            .map((ev: { id?: string; title?: string; description?: string; date?: string }) => {
              if (!ev?.date) return null;
              const startDate = new Date(ev.date);
              if (Number.isNaN(startDate.getTime())) return null;
              const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
              return {
                id: ev?.id,
                type: ev?.title ?? "Event",
                description: ev?.description ?? "",
                start: startDate,
                end: endDate,
                color: "#18181B",
                textColor: "#ffffff",
              } as Event;
            })
            .filter(Boolean) as Event[];
        })();

        if (backendEvents.length) {
          setEvents((prev) => {
            // Merge and deduplicate by ID
            const existingIds = new Set(prev.map(e => e.id).filter(Boolean));
            const newEvents = backendEvents.filter(e => !e.id || !existingIds.has(e.id));
            return [...prev, ...newEvents];
          });
        }
      } catch {
        // ignore errors, keep local data
      } finally {
        setLoadedRemote(true);
      }
    };
    fetchEvents();
  }, [loadedRemote]);

  useEffect(() => {
    const fetchEventRequests = async () => {
      if (!signedIn) return;
      setLoadingRequests(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
        const userId = localStorage.getItem("customerId");
        if (!userId) return;
        const token = localStorage.getItem("accessToken");
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const res = await fetch(
          `${base}/friendship/event-requests/${userId}/received`,
          { headers, cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setEventRequests(Array.isArray(data?.requests) ? data.requests : []);
        }
      } catch {
        // ignore errors
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchEventRequests();
  }, [signedIn]);

  async function respondToEventRequest(requestId: string, accept: boolean) {
    setLoadingRequests(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
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
      
      // Reload event requests and events
      const userId2 = localStorage.getItem("customerId");
      const token2 = localStorage.getItem("accessToken");
      const headers: Record<string, string> = token2
        ? { Authorization: `Bearer ${token2}` }
        : {};
      
      const [reqRes, eventsRes] = await Promise.all([
        fetch(`${base}/friendship/event-requests/${userId2}/received`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${base}/customer/${userId2}/notes`, { cache: "no-store" }),
      ]);
      
      if (reqRes.ok) {
        const reqData = await reqRes.json().catch(() => ({}));
        setEventRequests(Array.isArray(reqData?.requests) ? reqData.requests : []);
      }
      
      if (eventsRes.ok && accept) {
        const eventsData = await eventsRes.json().catch(() => ({}));
        const newEvents = Array.isArray(eventsData?.notes) ? eventsData.notes : [];
        const formattedEvents: Event[] = newEvents
          .map((ev: { id?: string; title?: string; description?: string; date?: string }) => {
            if (!ev?.date) return null;
            const startDate = new Date(ev.date);
            if (Number.isNaN(startDate.getTime())) return null;
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            return {
              id: ev?.id,
              type: ev?.title ?? "Event",
              description: ev?.description ?? "",
              start: startDate,
              end: endDate,
              color: "#18181B",
              textColor: "#ffffff",
            } as Event;
          })
          .filter(Boolean) as Event[];
        
        // Replace all backend events, keep only local dummy data events (those without IDs)
        setEvents((prev) => {
          const localEvents = prev.filter(e => !e.id);
          // Deduplicate backend events by ID
          const backendEventsMap = new Map<string, Event>();
          formattedEvents.forEach(e => {
            if (e.id) {
              backendEventsMap.set(e.id, e);
            }
          });
          return [...localEvents, ...Array.from(backendEventsMap.values())];
        });
      }
    } catch {
      // ignore errors
    } finally {
      setLoadingRequests(false);
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
  const handleDeleteEvent = async (target: Event) => {
    // Optimistic remove
    setEvents((prev) =>
      prev.filter((e) => {
        if (target.id && e.id) return e.id !== target.id;
        return !(
          e.type === target.type &&
          e.description === target.description &&
          e.start.getTime() === target.start.getTime() &&
          e.end.getTime() === target.end.getTime()
        );
      })
    );
    // Backend delete if id exists
    if (target.id) {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
        await fetch(`${base}/note/${target.id}`, { method: "DELETE" });
      } catch {
        // ignore errors (optimistic UI)
      }
    }
  };

  // Get upcoming events (next 7 days)
  const upcomingEvents = events.filter((event) => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return event.start >= now && event.start <= sevenDaysFromNow;
  });

  // Get today's events
  const todayEvents = events.filter((event) => {
    const today = new Date();
    const eventDate = new Date(event.start);
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  });

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-8">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Calendar</h1>
              <p className="text-muted-foreground mt-1">
                {signedIn
                  ? "Manage your events and hangouts"
                  : "Sign in to sync your events across devices"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <FormFields onAddEvent={handleAddEvent} />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-md border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-bold mt-1">{events.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-primary"
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
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold mt-1">{todayEvents.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-green-500/20 bg-gradient-to-br from-green-500/5 to-background">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming (7 days)</p>
                    <p className="text-2xl font-bold mt-1">{upcomingEvents.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Event Requests Section */}
        {signedIn && eventRequests.length > 0 && (
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
                          {getInitials(req.fromUser?.name, req.fromUser?.email)}
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
                        disabled={loadingRequests}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => respondToEventRequest(req.id, false)}
                        disabled={loadingRequests}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <Link href="/friends" className="text-sm text-primary hover:underline">
                  View all friends and manage requests →
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Container */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardContent className="p-6">
            <MyCalendar events={events} onDelete={handleDeleteEvent} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
