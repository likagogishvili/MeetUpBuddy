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
    <div className="p-2 text-left">
      <Modal isOpen={isOpen} onClose={closeModal}>
        {selectedEvent && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg capitalize">
              {selectedEvent.type}
            </h3>
            <p className="text-sm">{selectedEvent.description}</p>
            {onDelete && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedEvent) {
                      onDelete(selectedEvent);
                      closeModal();
                    }
                  }}
                >
                  Delete Note
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
        style={{ height: 650 }}
        defaultView="month"
        popup
        popupOffset={20}
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
