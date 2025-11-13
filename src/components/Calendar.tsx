"use client";

import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Event } from "@/types/calendarTypes";
import { Trash2 } from "lucide-react";

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
      <div className="bg-background text-foreground p-6 rounded-xl w-[min(92vw,560px)] shadow-2xl border relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
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
  onDelete,
}: {
  event: Event;
  openModal: (event: Event) => void;
  onDelete?: (event: Event) => void;
}) => {
  const label =
    event.type.charAt(0).toUpperCase() + event.type.slice(1);
  return (
    <div
      className="group text-sm p-2 rounded shadow cursor-pointer flex items-center justify-between gap-2"
      style={{ backgroundColor: event.color, color: event.textColor }}
      onClick={() => openModal(event)}
    >
      <span className="truncate">{label}</span>
      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDelete && (
          <button
            aria-label="Delete"
            className="inline-flex rounded-xs hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(event);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
};

const CustomToolbar = (toolbar: any) => (
  <div className="rbc-toolbar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b">
    <span className="rbc-toolbar-label text-2xl font-bold text-foreground">
      {toolbar.label}
    </span>
    <div className="rbc-btn-group flex gap-2">
      <button
        onClick={() => toolbar.onNavigate("TODAY")}
        className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Today
      </button>
      <button
        onClick={() => toolbar.onNavigate("PREV")}
        className="px-4 py-2 rounded-md text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        ← Back
      </button>
      <button
        onClick={() => toolbar.onNavigate("NEXT")}
        className="px-4 py-2 rounded-md text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        Next →
      </button>
    </div>
  </div>
);

import { Button } from "@/components/ui/button";

export default function MyCalendar({ events, onDelete }: { events: Event[]; onDelete?: (event: Event) => void }) {
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
    <div className="text-left">
      <Modal isOpen={isOpen} onClose={closeModal}>
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-xl capitalize mb-2">
                {selectedEvent.type}
              </h3>
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
              <span>
                {format(selectedEvent.start, "PPP 'at' p")} -{" "}
                {format(selectedEvent.end, "p")}
              </span>
            </div>
            {onDelete && (
              <div className="pt-2 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedEvent) {
                      onDelete(selectedEvent);
                      closeModal();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 700 }}
        defaultView="month"
        popup
        popupOffset={20}
        eventPropGetter={(event: any) => ({
          style: {
            backgroundColor: event.color,
            color: event.textColor,
            borderRadius: "6px",
            padding: "4px 8px",
            border: "none",
            fontSize: "0.875rem",
          },
        })}
        components={{
          toolbar: CustomToolbar,
          event: ({ event }: any) => (
            <EventComponent
              event={event}
              openModal={openModal}
              onDelete={onDelete}
            />
          ),
        }}
      />
    </div>
  );
}
