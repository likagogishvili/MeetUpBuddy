"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Smile } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

const formSchema = z.object({
  title: z.string().min(1, ""),
  description: z.string().min(1, ""),
  date: z.date({ required_error: "" }),
});

type FormValues = z.infer<typeof formSchema>;

type FormFieldsProps = {
  onAddEvent: (event: {
    type: string;
    description: string;
    start: Date;
    end: Date;
    color: string;
    textColor?: string;
  }) => void;
};

export default function FormFields({ onAddEvent }: FormFieldsProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      date: undefined,
    },
  });

	const EMOJIS: string[] = [
		"🎉","💛","📚","☕️","🗓️","💬","🚀","🎯","🤝","🍕","🎵","🏃‍♂️",
		"🧠","🌟","🔥","✨","🥳","🎁","🧋","🍔","🌸",
	];

	const onSubmit = async (values: FormValues) => {
		const eventDate = new Date(values.date);
		const start = new Date(eventDate.setHours(11, 0, 0, 0));
		const end = new Date(eventDate.setHours(12, 0, 0, 0));

		const newEvent = {
			type: values.title,
			description: values.description,
			start,
			end,
			...getColorByType("color"),
		};

		// Optimistically add to local calendar
		onAddEvent(newEvent);

		// Also create a backend note (calendar event)
		try {
			let customerId: string | null = null;
			try {
				customerId = localStorage.getItem("customerId");
			} catch {
				// no-op
			}
			if (customerId) {
				const base =
					process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
				await fetch(`${base}/note`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						title: values.title,
						description: values.description,
						date: start.toISOString(),
						customerId,
					}),
				});
			}
		} catch {
			// Ignore network/API errors; local event already added
		}

		form.reset();
		setOpen(false); // ❗ closes the dialog
	};

	function handleInsertEmoji(emoji: string) {
		const current = form.getValues("title") || "";
		const next = (current ? current + " " : "") + emoji;
		form.setValue("title", next);
	}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mx-auto block font-chewy">
          + Schedule a Hangout
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-center font-chewy text-2xl">
            Let’s Hang Out 🎉
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-chewy">Title</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          aria-label="Insert emoji into title"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 grid grid-cols-8 gap-1 p-2">
                        {EMOJIS.map((emj) => (
                          <button
                            key={emj}
                            type="button"
                            className="text-xl leading-none hover:scale-110 transition"
                            onClick={() => handleInsertEmoji(emj)}
                          >
                            {emj}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormControl>
                    <Input placeholder="Enter a title (e.g., Meeting with client)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
							<FormLabel className="font-chewy">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Briefly describe the event" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="font-chewy">Select Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-between mt-6">
              <DialogClose asChild>
                <Button variant="ghost" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>

              <Button
                type="submit"
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
              >
                Add to Calendar 📆
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Helper to style color
function getColorByType(type: string) {
  const map: Record<string, { color: string; textColor: string }> = {
    default: { color: "#18181B", textColor: "#ffffff" },
    color: { color: "#18181B", textColor: "#ffffff" },
  };
  return map[type] ?? map.default;
}
