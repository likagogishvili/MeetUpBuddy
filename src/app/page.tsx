"use client";
import MyCalendar from "@/components/Calendar";
import FormFields from "@/components/Form";
import Layout from "@/components/Layout";
import { dummyData } from "@/data/dummyData";
import { Event } from "@/types/calendarTypes";
import { useEffect, useState } from "react";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([...dummyData]);
  const [loadedRemote, setLoadedRemote] = useState(false);

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
          setEvents((prev) => [...prev, ...backendEvents]);
        }
      } catch {
        // ignore errors, keep local data
      } finally {
        setLoadedRemote(true);
      }
    };
    fetchEvents();
  }, [loadedRemote]);
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

  return (
    <Layout>
      <FormFields onAddEvent={handleAddEvent} />
      <MyCalendar events={events} onDelete={handleDeleteEvent} />
    </Layout>
  );
}
