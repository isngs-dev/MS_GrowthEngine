/**
 * All marketing copy lives here, verbatim from the brief.
 * Components import from this file so wording is edited in exactly one place.
 */

export const BRAND = {
  product: "MS Growth Engine",
  company: "iSN Business Solutions",
  url: "https://www.isngs.com/",
} as const;

export const CTA_LABEL = "BUILD MY GROWTH ENGINE";

export const NAV = { cta: CTA_LABEL } as const;

export const HERO = {
  headline: "From First Click to Booked Call. Automatically.",
  headlineHighlight: ["Automatically."],
  cta: CTA_LABEL,
} as const;

export const STATEMENT = {
  headline: "One System. From First Click to Booked Appointment.",
  headlineHighlight: ["One", "System."],
  body: "MS Growth Engine connects marketing, AI engagement, qualification, and CRM into one automated sales flow built specifically for Mystery Shopping companies.",
  nodes: ["Marketing", "AI Engagement", "Qualification", "CRM"],
  nos: [
    "No disconnected tools.",
    "No waiting for a lead to be followed up.",
    "No opportunities getting lost between marketing and sales.",
  ],
} as const;

export const SYSTEM = {
  headline: "Everything Your Sales Funnel Needs. Connected.",
  headlineHighlight: ["Connected."],
  sub: "MS Growth Engine takes a prospect from first interaction to booked sales appointment through one connected system.",
  steps: [
    {
      n: "01",
      name: "UNDERSTAND",
      body: "We start by understanding your Mystery Shopping company, your USPs, services, strengths, and ideal clients.",
    },
    {
      n: "02",
      name: "DEFINE",
      body: "We collaboratively build your Ideal Customer Profile (ICP) based on your business, experience, and client feedback.",
    },
    {
      n: "03",
      name: "ATTRACT",
      body: "We create customized static and video campaigns for LinkedIn and Meta designed to reach your ideal prospects.",
    },
    {
      n: "04",
      name: "CONVERT",
      body: "Interested prospects are directed to a customized landing page built around your company, services, and value proposition.",
    },
    {
      n: "05",
      name: "ENGAGE",
      body: "Meet Rene, your AI Sales Assistant. Rene engages with prospects immediately, answers questions, shares relevant information, and keeps the conversation moving.",
    },
    {
      n: "06",
      name: "QUALIFY",
      body: "Rene learns about the prospect, understands their needs, and helps identify genuine sales opportunities.",
    },
    {
      n: "07",
      name: "BOOK",
      body: "When the prospect is ready, Rene helps them schedule a conversation with your sales team.",
    },
    {
      n: "08",
      name: "SYNC",
      body: "The prospect's information and conversation data are updated in your CRM in real time.",
    },
  ],
  outcomeLabel: "THE OUTCOME:",
  outcome: ["A qualified prospect.", "A booked appointment.", "A sales team ready to take over."],
} as const;

export const ABOUT = {
  headline: "Built by iSN. Built on Mystery Shopping Expertise.",
  headlineHighlight: ["Mystery", "Shopping", "Expertise."],
  paragraphs: [
    "iSN has spent years working within the Mystery Shopping industry, supporting companies across editing, quality assurance, shopper recruitment, analytics, and business growth.",
    "Today, iSN combines that industry knowledge with digital marketing, AI, automation, and technology to build systems that help Mystery Shopping companies grow.",
    "With 20+ years of client delivery, 50+ U.S. clients supported, and 100K+ Mystery Shops processed, iSN understands both the operational side of Mystery Shopping and the challenges involved in generating new business.",
  ],
  stats: [
    { value: 20, suffix: "+", label: "Years of Client Delivery" },
    { value: 50, suffix: "+", label: "U.S. Clients Supported" },
    { value: 100, suffix: "K+", label: "Mystery Shops Processed" },
  ],
  closing: ["Mystery Shopping Expertise", "Digital Growth", "AI"],
  closingSub: "One connected system designed around how your business actually works.",
} as const;

export const FORM = {
  headline: "Ready to Build Your MS Growth Engine?",
  headlineHighlight: ["MS", "Growth", "Engine?"],
  body: "Tell us a little about your business and let's explore what your Growth Engine could look like.",
  submit: CTA_LABEL,
  fields: {
    name: "Name",
    company: "Company Name",
    website: "Company Website",
    phone: "Phone",
    email: "Email",
  },
  success: "Thank you. We'll be in touch shortly.",
  // not in the brief: shown only if the placeholder handler rejects
  error: "Something went wrong sending your details. Please try again.",
} as const;

/** Step two of the form (from the hand-written brief). Wording of title/labels is not in the brief. */
export const SCHEDULE = {
  title: "Schedule a meet",
  body: "Pick a date and time for a call, or skip it and we will just email you.",
  date: "Date",
  time: "Time",
  zone: "Your time zone:",
  book: "Book meeting",
  booking: "Booking...",
  decline: "No, just email me, thanks",
  error: "Something went wrong. Please try again.",
  slotTaken: "That time is already taken. Please choose another time.",
  bookedNote: "Your call is booked. We've emailed your confirmation and meeting link.",
  emailedNote: "We've emailed your confirmation.",
} as const;

export const FOOTER = {
  rights: "All rights reserved.",
} as const;
