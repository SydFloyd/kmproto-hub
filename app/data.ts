export const EMAIL = "kyleaddison98@gmail.com";

export const mailto = (subject: string, body?: string) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;

export const services = [
  {
    id: "websites",
    name: "Websites",
    summary: "Business websites and redesigns that explain your services and make it easy for customers to contact you.",
    items: ["New websites and redesigns", "Mobile layouts and contact forms", "Search setup and performance", "Optional hosting and support"],
    href: mailto("Website project inquiry"),
    link: "Discuss a website project",
  },
  {
    id: "automation",
    name: "AI & workflow automation",
    summary: "Connections between your existing tools to reduce repeated data entry and routine administrative work.",
    items: ["Lead intake and follow-up", "Email sorting and draft replies", "Document data extraction", "Reporting and tool connections"],
    href: mailto("Automation project inquiry"),
    link: "Discuss an automation project",
  },
  {
    id: "software",
    name: "Custom software",
    summary: "Applications built around a specific business requirement, with a working prototype to confirm the approach.",
    items: ["Internal dashboards", "Customer portals", "Quoting and booking tools", "Application integrations"],
    href: mailto("Custom software project inquiry"),
    link: "Discuss a software project",
  },
] as const;

export const process = [
  { step: "01", name: "Agree the scope", copy: "We discuss your requirements, content and goals. You receive a written scope and schedule before work begins." },
  { step: "02", name: "Review the design", copy: "You review the proposed design or prototype before the full build. Feedback is gathered in agreed revision rounds." },
  { step: "03", name: "Build and test", copy: "I develop the site or application, check it on mobile and desktop, and work through the agreed changes." },
  { step: "04", name: "Launch and hand off", copy: "You receive your project and account handoff. Website builds include 30 days of defect correction; ongoing support is optional." },
] as const;

export const projects = [
  { name: "Stillcraft", description: "An early photo composition editor for arranging and cropping images on your device.", category: "Photo composition", href: "https://stillcraft.kmproto.com" },
  { name: "Food Miller", description: "A collection of recipes to browse, share and return to.", category: "Recipes", href: "https://foodmiller.com" },
  { name: "Verseform", description: "A writing app with Scripture previews and passage insertion.", category: "Writing", href: "https://verseform.kmproto.com" },
  { name: "Shep Study", description: "A Bible study app for reading and exploring Scripture.", category: "Bible study", href: "https://shepstudy.com" },
  { name: "ChordLift", description: "A music tool for adapting and formatting chord charts.", category: "Music tools", href: "https://chordlift.kmproto.com" },
  { name: "Bible Audio", description: "The whole English Bible spoken on your device, with small downloads and apps for offline listening.", category: "Offline audio", href: "https://bible-audio.kmproto.com" },
  { name: "Milk Yeller", description: "Photography and written stories.", category: "Photography", href: "https://milk-yeller.com" },
] as const;

export const labProjects = [
  ...projects,
  { name: "Games", description: "Arcade classics to play in your browser.", category: "Browser games", href: "/lab/games" },
  { name: "Smoker Control Lab", description: "Explore wood, pellets and simultaneous hybrid combustion, adjust the dampers, and watch a software controller balance the heat.", category: "Thermodynamics", href: "/lab/smoker" },
] as const;
