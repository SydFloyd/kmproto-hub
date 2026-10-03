// Client-facing prices and scope from KM_Proto_Website_Pricing.pdf, October 2026.
export const PRICING_GUIDE = "/downloads/km-proto-website-pricing.pdf";
export const PRICING_DATE = "October 2026";

export const websitePackages = [
  {
    name: "One-page",
    price: "$1,200",
    description: "A focused website for one offer, campaign or compact business.",
    features: ["1 page, up to 6 sections", "Contact form and core build features", "No blog or content editor"],
  },
  {
    name: "Business",
    price: "$2,500",
    description: "A complete starting point for a local business or organization.",
    features: ["Up to 5 standard pages", "Home, About, Services, Work and Contact, for example", "No blog or content editor"],
  },
  {
    name: "Expanded",
    price: "$4,500",
    description: "More room for services, projects and regularly updated content.",
    features: ["Up to 10 standard pages and a simple CMS", "1 blog/content collection and 3 supplied entries", "45-minute training; no store or member accounts"],
  },
] as const;

export const websiteAddons = [
  { name: "Additional content page", fee: "$250 / page", scope: "Existing layout; up to 600 supplied words and 6 images." },
  { name: "Original copywriting", fee: "$200 / page", scope: "Up to 500 words from your brief; one revision." },
  { name: "Simple blog / CMS", fee: "$750", scope: "One collection, 3 supplied entries and training. Included in Expanded." },
  { name: "Booking / donation embed", fee: "$250", scope: "One existing provider widget or hosted payment link; no custom logic." },
  { name: "Form-to-service connection", fee: "From $500", scope: "One form to one CRM or email tool through a supported connector." },
  { name: "Content migration", fee: "From $350", scope: "Up to 5 simple pages and 10 redirects; accessible existing content." },
  { name: "Focused existing-site refresh", fee: "From $600", scope: "Up to 6 hours of agreed improvements after review; no rebuild." },
  { name: "Extra changes / revisions", fee: "$100 / hour", scope: "Approved out-of-scope work; 30-minute minimum per request." },
] as const;

export const monthlyServices = [
  { name: "Self-managed", fee: "$0 to KM Proto", scope: "Launch handoff included. You manage hosting and ongoing operations." },
  { name: "Managed hosting", fee: "$25 / month", scope: "Brochure-site hosting administration, HTTPS and uptime alerts. Edits and repair labor are separate." },
  { name: "Website care", fee: "$95 / month", scope: "Managed hosting plus monthly site/form and recovery checks; 30 minutes of edits or routine fixes." },
] as const;
