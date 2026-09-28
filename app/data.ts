export const EMAIL = "kyleaddison98@gmail.com";

export const mailto = (subject: string, body?: string) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;

export const services = [
  {
    id: "websites",
    index: "01",
    name: "Websites",
    headline: "A website that earns its keep.",
    summary:
      "Fast, polished sites that explain what you do, look sharp on every phone, and make it easy for the right customers to reach you.",
    items: ["New sites & redesigns", "Landing pages", "Search & speed basics", "Hosting, updates & care"],
  },
  {
    id: "automation",
    index: "02",
    name: "AI automation",
    headline: "Hand the busywork to the robots.",
    summary:
      "Practical AI and automations that take repetitive tasks off your plate, connected to the tools you already use.",
    items: ["Lead intake & follow-up", "Email triage & drafting", "Data pulled from documents", "Assistants trained on your info"],
  },
  {
    id: "software",
    index: "03",
    name: "Custom software",
    headline: "Tools shaped around how you work.",
    summary:
      "When off-the-shelf doesn’t fit, you get a tool built for your business. Start with a working prototype, then grow it into something dependable.",
    items: ["Internal dashboards", "Customer portals", "Quoting & booking tools", "Integrations between apps"],
  },
] as const;

export const process = [
  {
    step: "01",
    name: "Talk",
    copy: "A relaxed call about your business, what’s working and what’s wasting your time. No jargon, no pressure.",
  },
  {
    step: "02",
    name: "Prototype",
    copy: "You see something real early. A clickable draft or working proof lets us make decisions with evidence instead of guesses.",
  },
  {
    step: "03",
    name: "Build",
    copy: "The good version, built carefully and tested properly, with regular check-ins so there are no surprises.",
  },
  {
    step: "04",
    name: "Support",
    copy: "Launch is the start, not the end. I stay on hand for fixes, improvements and the next good idea.",
  },
] as const;

export const principles = [
  { title: "Straight to the builder", copy: "You work directly with the person designing and writing the code. Nothing gets lost in a handoff." },
  { title: "Plain English", copy: "Clear scope and honest timelines, explained without the tech-speak." },
  { title: "Small-business sized", copy: "Solutions that match your budget and your team. No enterprise bloat." },
  { title: "Yours to keep", copy: "Your site, your code, your data. You won’t be locked into anything." },
] as const;

export const chores = [
  { id: "leads", task: "Retyping leads into a spreadsheet", auto: "Form entries land in your CRM automatically", hours: 2 },
  { id: "faq", task: "Answering the same questions by email", auto: "An assistant drafts replies from your own info", hours: 3 },
  { id: "schedule", task: "Scheduling back-and-forth", auto: "Customers book open slots themselves", hours: 2 },
  { id: "quotes", task: "Building quotes by hand", auto: "Quotes generate from a short form", hours: 3 },
  { id: "invoices", task: "Chasing unpaid invoices", auto: "Polite reminders go out on schedule", hours: 1.5 },
  { id: "pdfs", task: "Copying data out of PDFs", auto: "Documents are read and filed for you", hours: 2 },
  { id: "followup", task: "Remembering to follow up", auto: "Follow-ups are queued and sent on time", hours: 2 },
  { id: "reports", task: "Stitching together weekly reports", auto: "A live dashboard updates itself", hours: 1.5 },
] as const;

export const projects = [
  {
    name: "Stillcraft",
    description: "Bring a photo, add another, then arrange and crop a picture of your own. An early preview that runs right on your device.",
    category: "Photo composition",
    href: "https://stillcraft.kmproto.com",
    tone: "clay",
    glyph: "❖",
  },
  {
    name: "ChordLift",
    description: "Less formatting, more playing. Turn the chord chart you found into the one you need.",
    category: "Music tools",
    href: "https://chordlift.kmproto.com",
    tone: "cobalt",
    glyph: "♫",
  },
  {
    name: "Food Miller",
    description: "The recipes you pass around, come back to and make your own. Pull up a chair.",
    category: "Recipes",
    href: "https://foodmiller.com",
    tone: "tomato",
    glyph: "✺",
  },
  {
    name: "Verseform",
    description: "Write freely. Type a Scripture reference to preview or insert the passage without leaving the page.",
    category: "Writing",
    href: "https://verseform.kmproto.com",
    tone: "ink",
    glyph: "¶",
  },
  {
    name: "Shep Study",
    description: "A quiet space to slow down, open Scripture and follow your curiosity deeper.",
    category: "Bible study",
    href: "https://shepstudy.com",
    tone: "moss",
    glyph: "✦",
  },
  {
    name: "Milk Yeller",
    description: "An eye for the ordinary. Photography and stories that invite a second look.",
    category: "Photography",
    href: "https://milk-yeller.com",
    tone: "butter",
    glyph: "◎",
  },
] as const;
