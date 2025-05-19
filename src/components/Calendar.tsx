"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Event } from "@/types/calendarTypes";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Dummy modal for event display
const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-sm relative">
        <button onClick={onClose} className="absolute top-2 right-2">
          ❌
        </button>
        {children}
      </div>
    </div>
  );
};

const EventComponent = ({
  event,
  openModal,
}: {
  event: Event;
  openModal: (event: Event) => void;
}) => (
  <div
    className="text-sm p-2 rounded shadow cursor-pointer"
    style={{ backgroundColor: event.color, color: event.textColor }}
    onClick={() => openModal(event)}
  >
    {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
  </div>
);

const CustomToolbar = (toolbar: any) => (
  <div className="rbc-toolbar flex justify-between items-center mb-4">
    <span className="rbc-toolbar-label text-xl font-bold text-[#9F9FA9] bg-black">
      {toolbar.label}
    </span>
    <div className="rbc-btn-group space-x-2">
      <button
        onClick={() => toolbar.onNavigate("TODAY")}
        className="!text-[#9F9FA9] hover:!text-black"
      >
        Today
      </button>
      <button
        onClick={() => toolbar.onNavigate("PREV")}
        className="!text-[#9F9FA9] hover:!text-black"
      >
        Back
      </button>
      <button
        onClick={() => toolbar.onNavigate("NEXT")}
        className="!text-[#9F9FA9] hover:!text-black"
      >
        Next
      </button>
    </div>
  </div>
);

export default function MyCalendar({ events }: { events: Event[] }) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = (event: Event) => {
    setSelectedEvent(event);
    setIsOpen(true);
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setIsOpen(false);
  };

  return (
    <div className="p-2">
      <Modal isOpen={isOpen} onClose={closeModal}>
        {selectedEvent && (
          <div>
            <h3 className="font-bold text-lg mb-1 capitalize">
              {selectedEvent.type}
            </h3>
            <p className="text-sm mb-1">{selectedEvent.description}</p>
          </div>
        )}
      </Modal>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 650 }}
        defaultView="month"
        eventPropGetter={(event: any) => ({
          style: {
            backgroundColor: event.color,
            color: event.textColor,
            borderRadius: "6px",
            padding: "2px",
          },
        })}
        components={{
          toolbar: CustomToolbar,
          event: (props: any) => (
            <EventComponent {...props} openModal={openModal} />
          ),
        }}
      />
    </div>
  );
}
