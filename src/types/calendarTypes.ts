export type Event = {
  id?: string; // backend note id when available
  type: string;
  start: Date;
  end: Date;
  color?: string;
  textColor?: string;
  description: string;
};

