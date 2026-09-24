/**
 * Opening lines offered in an empty thread.
 *
 * A conversation that begins with a blank box and no context is the point
 * people leave: a planner who just got accepted doesn't know whether they're
 * supposed to say anything, and a host staring at "No messages yet" writes
 * nothing. One tap that puts a warm, specific first line in the composer is
 * enough to get past it.
 *
 * Suggestions **fill the composer, they don't send**. Nothing should put words
 * in someone's mouth without letting them read and change them first.
 *
 * Pure — no storage, no `window`. Two per case at most; a wall of canned
 * options is its own kind of paralysis.
 */

/** Who the viewer is *within this thread*, not their app-wide role. */
export type StarterRole = "organizer" | "venue_owner" | "vendor";

export type StarterThreadKind = "booking" | "proposal" | "event";

const STARTERS: Record<StarterThreadKind, Record<StarterRole, string[]>> = {
  booking: {
    organizer: [
      "I'm looking forward to possibly working with you! I'd love to clarify some details of the event if you had any questions.",
      "Is there anything you need from me before the day?",
    ],
    venue_owner: [
      "Thank you for requesting this space! Let's chat details.",
      "Happy to walk you through how load-in and close-out work here.",
    ],
    // A vendor is never a party to a booking thread; included so the map stays
    // total rather than needing a lookup guard at every call site.
    vendor: [],
  },
  proposal: {
    organizer: [
      "Thanks for the proposal! I'd love to talk through a few details of the event before we lock anything in.",
      "Could you tell me a bit more about what you'd need on site?",
    ],
    vendor: [
      "Thanks for reaching out! Happy to answer anything about what's included.",
      "Glad to be considered — what does the run of show look like?",
    ],
    venue_owner: [],
  },
  event: {
    organizer: [
      "Introducing you both — thanks for being part of this one. Let's use this thread for load-in, power, and timing.",
      "Anything either of you needs from the other, this is the place to ask.",
    ],
    venue_owner: [
      "Welcome — anything you need to know about the space, just ask here.",
      "Happy to sort out load-in times and access whenever you're ready.",
    ],
    vendor: [
      "Great to meet you both! I'll ask here if I have questions about the space.",
      "When would you like me on site for setup?",
    ],
  },
};

export function getConversationStarters(kind: StarterThreadKind, role: StarterRole): string[] {
  return STARTERS[kind][role];
}
