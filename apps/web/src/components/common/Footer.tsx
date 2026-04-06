import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto mb-16 md:mb-0">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary mb-3">
              <Ticket className="h-5 w-5" />
              TicketFlow
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your one-stop platform for booking movies, concerts, sports events, and live experiences.
            </p>
          </div>

          {/* Events */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Events</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Movies", "Concerts", "Sports", "Theatre", "Comedy"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-foreground transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Help</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["FAQ", "Cancellation Policy", "Contact Us", "Terms of Service", "Privacy Policy"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-foreground transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Organizers */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Organizers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/organizer/dashboard" className="hover:text-foreground transition-colors">List Your Event</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Organizer Guide</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TicketFlow. All rights reserved.</p>
          <p>Built with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}
