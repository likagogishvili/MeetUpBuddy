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
import { Calendar as CalendarIcon, Users } from "lucide-react";
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
import { useState, useEffect } from "react";

type Friend = { id: string; name?: string; email?: string };

const formSchema = z.object({
  title: z.string().min(1, ""),
  description: z.string().min(1, ""),
  date: z.date({ required_error: "" }),
  time: z.string().min(1, "Time is required"),
  duration: z.string(),
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      date: undefined,
      time: "",
      duration: "60",
    },
  });

  useEffect(() => {
    const fetchFriends = async () => {
      if (!open) return;
      setLoadingFriends(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4001";
        const userId = localStorage.getItem("customerId");
        if (!userId) return;
        const token = localStorage.getItem("accessToken");
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const res = await fetch(`${base}/friendship/friends/${userId}`, {
          headers,
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const friendsList = Array.isArray(data)
            ? data
            : Array.isArray(data?.friends)
            ? data.friends
            : [];
          setFriends(friendsList);
        }
      } catch {
        // ignore errors
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriends();
  }, [open]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

	const EMOJIS: string[] = [
		"🎉","💛","📚","☕️","🗓️","💬","🚀","🎯","🤝","🍕","🎵","🏃‍♂️",
		"🧠","🌟","🔥","✨","🥳","🎁","🧋","🍔","🌸",
	];

	const onSubmit = async (values: FormValues) => {
		// Parse time (HH:mm format)
		const [hours, minutes] = values.time.split(":").map(Number);
		const eventDate = new Date(values.date);
		eventDate.setHours(hours, minutes, 0, 0);
		
		// Calculate end time based on duration
		const durationMinutes = parseInt(values.duration) || 60;
		const start = new Date(eventDate);
		const end = new Date(eventDate.getTime() + durationMinutes * 60 * 1000);

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
			let token: string | null = null;
			try {
				customerId = localStorage.getItem("customerId");
				token = localStorage.getItem("accessToken");
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

				// Send event requests to selected friends individually
				if (selectedFriends.size > 0 && token) {
					const selectedFriendsList = friends.filter((f) =>
						selectedFriends.has(f.id)
					);
					
					// Send individual requests to each friend
					const requestPromises = selectedFriendsList.map(async (friend) => {
						if (!friend.email) {
							console.warn(`Friend ${friend.id} (${friend.name || 'Unknown'}) does not have an email address`);
							return { success: false, friend: friend.name || friend.id, error: 'No email address' };
						}
						
						try {
							const res = await fetch(`${base}/friendship/request-event/${customerId}`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
								body: JSON.stringify({
									email: friend.email,
									title: values.title,
									description: values.description,
									date: start.toISOString(),
								}),
							});
							
							if (!res.ok) {
								const errorData = await res.json().catch(() => ({}));
								const errorMsg = errorData?.message || `Request failed (${res.status})`;
								console.error(`Failed to send event request to ${friend.email}:`, errorMsg);
								return { success: false, friend: friend.name || friend.email, error: errorMsg };
							}
							
							const data = await res.json().catch(() => ({}));
							if (data.availability && !data.availability.isAvailable) {
								console.warn(`Friend ${friend.email} is not available on this date`);
								return { success: false, friend: friend.name || friend.email, error: 'Friend not available on this date' };
							}
							
							return { success: true, friend: friend.name || friend.email };
						} catch (error) {
							const errorMsg = error instanceof Error ? error.message : 'Unknown error';
							console.error(`Error sending event request to ${friend.email}:`, errorMsg);
							return { success: false, friend: friend.name || friend.email, error: errorMsg };
						}
					});
					
					// Wait for all requests to complete
					const results = await Promise.all(requestPromises);
					const successCount = results.filter(r => r.success).length;
					const failCount = results.filter(r => !r.success).length;
					const errorMessages = results.filter(r => !r.success).map(r => `${r.friend}: ${r.error}`);
					
					// Set feedback for user
					setRequestFeedback({
						success: successCount,
						failed: failCount,
						errors: errorMessages.length > 0 ? errorMessages : undefined,
					});
					
					if (failCount > 0) {
						console.warn(`Failed to send ${failCount} out of ${selectedFriendsList.length} event requests`);
					}
					if (successCount > 0) {
						console.log(`Successfully sent ${successCount} event request(s)`);
					}
				}
			}
		} catch {
			// Ignore network/API errors; local event already added
		}

		form.reset({
			title: "",
			description: "",
			date: undefined,
			time: "",
			duration: "60",
		});
		setSelectedFriends(new Set());
		setInviteSectionOpen(false);
		
		// Close dialog after a brief delay to show feedback, or immediately if no friends selected
		if (selectedFriends.size === 0) {
			setOpen(false);
			setRequestFeedback(null);
		} else {
			// Keep dialog open briefly to show feedback, then close
			setTimeout(() => {
				setOpen(false);
				setRequestFeedback(null);
			}, 3000);
		}
	};

	function handleInsertEmoji(emoji: string) {
		const current = form.getValues("title") || "";
		const next = (current ? current + " " : "") + emoji;
		form.setValue("title", next);
	}

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setRequestFeedback(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button className="font-chewy shadow-md hover:shadow-lg transition-shadow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Schedule a Hangout
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-chewy">Date</FormLabel>
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

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-chewy">Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-chewy">Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      placeholder="60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invite Friends Section */}
            {friends.length > 0 && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setInviteSectionOpen(!inviteSectionOpen)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Invite Friends {selectedFriends.size > 0 && `(${selectedFriends.size})`}
                </Button>
                {inviteSectionOpen && (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {loadingFriends ? (
                      <p className="text-sm text-muted-foreground">Loading friends...</p>
                    ) : friends.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No friends yet</p>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleFriend(friend.id)}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedFriends.has(friend.id)}
                              onChange={() => toggleFriend(friend.id)}
                              className="h-4 w-4 rounded border-input cursor-pointer accent-primary"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {friend.name || "Unknown"}
                            </p>
                            {friend.email && (
                              <p className="text-xs text-muted-foreground">
                                {friend.email}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Request Feedback */}
            {requestFeedback && (
              <div className="space-y-2">
                {requestFeedback.success > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      ✓ Successfully sent {requestFeedback.success} event request{requestFeedback.success !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                {requestFeedback.failed > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium mb-1">
                      ✗ Failed to send {requestFeedback.failed} event request{requestFeedback.failed !== 1 ? 's' : ''}
                    </p>
                    {requestFeedback.errors && requestFeedback.errors.length > 0 && (
                      <ul className="text-xs text-destructive/80 list-disc list-inside space-y-1">
                        {requestFeedback.errors.slice(0, 3).map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {requestFeedback.errors.length > 3 && (
                          <li>...and {requestFeedback.errors.length - 3} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

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
