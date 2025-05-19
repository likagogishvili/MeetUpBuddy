"use client";
import MyCalendar from "@/components/Calendar";
import FormFields from "@/components/Form";
import Layout from "@/components/Layout";
import { dummyData } from "@/data/dummyData";
import { Event } from "@/types/calendarTypes";
import { useState } from "react";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([...dummyData]);

  const handleAddEvent = (event: any) => {
    setEvents((prev) => [...prev, event]);
  };
  return (
    <Layout>
      <FormFields onAddEvent={handleAddEvent} />
      <MyCalendar events={events} />
    </Layout>
  );
}
