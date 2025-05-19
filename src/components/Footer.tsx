export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background px-6 py-4 text-sm text-muted-foreground font-chewy">
      <div className="max-w-6xl mx-auto text-center">
        © {new Date().getFullYear()} <span className="font-chewy">MeetUpBuddy</span>. All rights reserved.
      </div>
    </footer>
  );
}
