import { Event } from "@/types/calendarTypes";

const today = new Date();
const tomorrow = new Date(today);
const dayAfterTomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
dayAfterTomorrow.setDate(today.getDate() + 2);

const getColorByType = (type: string) => {
  const colorMap: Record<string, { color: string; textColor: string }> = {
    color: { color: "#18181B", textColor: "#ffffff" },
  };
  return colorMap[type] || { color: "#18181B", textColor: "#ffffff" };
};

export const dummyData: Event[] = [
  {
    type: "Meeting 👩🏻‍💻",
    start: new Date(dayAfterTomorrow.setHours(9, 0, 0, 0)),
    end: new Date(dayAfterTomorrow.setHours(9, 30, 0, 0)),
    description: "Avocado toast with eggs",
    ...getColorByType("color"),
  },
  {
    type: "Reading 📚",
    start: new Date(tomorrow.setHours(19, 30, 0, 0)),
    end: new Date(tomorrow.setHours(20, 30, 0, 0)),
    description: "Pasta with pesto",
    ...getColorByType("color"),
  },
];
