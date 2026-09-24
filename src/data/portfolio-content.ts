import type { Project } from "../types/project";
import type { Experience } from "../types/experiences";

/**
 * Curated portfolio content.
 *
 * Two jobs:
 * 1. FALLBACK - if the API is unreachable or empty, public pages render this
 *    instead of an error/empty state. The public site must never look broken.
 * 2. COPY OVERRIDES - project descriptions here follow the
 *    Problem → What I built → Tech → Impact format and take precedence over
 *    API copy for matching slugs (see lib/public-content.ts).
 */

const TS = "2026-01-01 00:00:00";

export const FALLBACK_PROJECTS: Project[] = [
    {
        id: 1,
        slug: "qiubbx",
        title: "QIUBBX - Zero-Commission Halal Marketplace",
        description:
            "Marketplace sellers lose a cut of every sale to platform commissions. QIUBBX is a zero-commission Halal marketplace - I built the storefront and seller experience as a Next.js PWA with AI-powered analytics, multi-currency payments, and integrated logistics. Sellers keep 100% of their earnings on a platform built for ethical commerce.",
        imageUrl:
            "https://www.qiubbx.com/_next/image?url=%2Fassets%2Fimages%2Flogos%2Flogo_text_light.png&w=256&q=75",
        // The source asset is a small text lockup, not a screenshot - render
        // it contained on a light surface, never object-cover full-bleed.
        imageVariant: "width-banner",
        technologies: [
            "Next.js",
            "TypeScript",
            "Tailwind CSS",
            "React",
            "AI Analytics",
            "Payment Integration",
            "PWA",
        ],
        githubUrl: "",
        liveUrl: "https://qiubbx.com",
        year: 2025,
        role: "Full Stack Developer",
        projectType: "business",
        tags: ["web", "nextjs", "marketplace", "e-commerce"],
        status: "completed",
        featured: true,
        displayOrder: 1,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 2,
        slug: "com-invois",
        title: "Invois - Offline-First Invoice App",
        description:
            "Freelancers often need to issue invoices on the spot - with or without a connection. I designed and shipped Invois, an offline-first Flutter app with local ObjectBox storage, client management, and high-quality PDF export, published on Google Play. Works 100% offline with a small APK and instant startup.",
        imageUrl: "/images/projects/invois/invois.png",
        imageVariant: "logo",
        technologies: [
            "Flutter",
            "Dart",
            "ObjectBox",
            "Riverpod",
            "PDF Generation",
            "Android",
        ],
        githubUrl: "https://github.com/hafizbahtiar/invoice",
        liveUrl: "https://play.google.com/store/apps/details?id=com.invois",
        year: 2025,
        role: "Full Stack Developer",
        projectType: "personal",
        tags: ["mobile", "flutter", "offline-first", "productivity"],
        status: "completed",
        featured: false,
        displayOrder: 2,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 3,
        slug: "eppp-dbkl",
        title: "ePerolehan DBKL - Government Procurement",
        description:
            "Kuala Lumpur City Hall (DBKL) needed to digitize its tender procurement process. I work on the platform's Flutter mobile app and Laravel services, letting registered vendors browse and purchase tenders and track project progress. A live government platform serving real procurement workflows.",
        imageUrl:
            "https://eperolehan.dbkl.gov.my/assets-metronic/media/logos/open-sidebar-logo_headerhome.png",
        imageVariant: "width-banner",
        technologies: ["Laravel", "Flutter", "PostgreSQL", "RESTful API"],
        githubUrl: "",
        liveUrl: "",
        year: 2024,
        role: "Full Stack Developer",
        projectType: "work",
        tags: ["web", "mobile", "government", "procurement"],
        status: "in-progress",
        featured: false,
        displayOrder: 3,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 4,
        slug: "sf-cit-receipt-book",
        title: "CIT Receipt Book - Audit-Ready Operations",
        description:
            "Cash-in-transit operations ran on paper receipt books that were slow to audit. I built a web system that digitizes the entire receipt lifecycle on CodeIgniter and PostgreSQL, with a Kotlin companion app - making every transaction trackable and audit-ready for compliance.",
        imageUrl:
            "https://cit.securiforce.net/app-assets/logo/9a6cefbceff3cf135b0b90cc9058c0c1.png",
        imageVariant: "logo",
        technologies: ["CodeIgniter 3", "PostgreSQL", "Kotlin", "Docker"],
        githubUrl: "",
        liveUrl: "",
        year: 2023,
        role: "Frontend Developer",
        projectType: "work",
        tags: ["web", "security", "fintech"],
        status: "completed",
        featured: false,
        displayOrder: 4,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 5,
        slug: "jom-dapur",
        title: "Jom Dapur - Food Delivery Platform",
        description:
            "Local restaurants needed a delivery channel of their own, in the spirit of Grab and Foodpanda. I built the customer app in React Native and the Node.js/Express backend on MongoDB - with real-time order tracking over Socket.io and Stripe payments. An end-to-end delivery platform shipped by a small team.",
        imageUrl: "/images/projects/jom-dapur.jpg",
        imageVariant: "logo",
        technologies: [
            "React Native",
            "Node.js",
            "Express.js",
            "MongoDB",
            "Socket.io",
            "Stripe",
        ],
        githubUrl: "",
        liveUrl: "",
        year: 2021,
        role: "Full Stack Developer",
        projectType: "work",
        tags: ["mobile", "react-native", "food-delivery", "logistics"],
        status: "completed",
        featured: false,
        displayOrder: 5,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 6,
        slug: "jd-management",
        title: "JD Management - Operations Dashboard",
        description:
            "Operating a delivery platform needs more than an app - it needs visibility. I built Jom Dapur's admin dashboard in React with Node.js APIs: live operational metrics, financial reporting, and investor-facing KPIs behind role-based access control.",
        imageUrl: "/images/projects/jd-management.png",
        // The asset is a square logo, not a dashboard screenshot - composed
        // preview treatment, same as the other logo-only projects.
        imageVariant: "logo",
        technologies: [
            "React",
            "Node.js",
            "Express.js",
            "MongoDB",
            "Chart.js",
            "Socket.io",
        ],
        githubUrl: "",
        liveUrl: "",
        year: 2021,
        role: "Full Stack Developer",
        projectType: "work",
        tags: ["web", "analytics", "dashboard"],
        status: "completed",
        featured: false,
        displayOrder: 6,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 7,
        slug: "jd-delivery",
        title: "JD Delivery - Rider App",
        description:
            "Riders are the moving part of any delivery platform. I built the React Native rider app: real-time order assignment, GPS navigation, earnings tracking, and push notifications - wired to the same Node.js backend powering the rest of the ecosystem.",
        imageUrl: "/images/projects/jom-dapur.jpg",
        imageVariant: "logo",
        technologies: [
            "React Native",
            "Node.js",
            "MongoDB",
            "Google Maps API",
            "Push Notifications",
        ],
        githubUrl: "",
        liveUrl: "",
        year: 2021,
        role: "Mobile App Developer",
        projectType: "work",
        tags: ["mobile", "react-native", "gps", "logistics"],
        status: "completed",
        featured: false,
        displayOrder: 7,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 8,
        slug: "wetrack-system",
        title: "Wetrack - Secure Code Automation",
        description:
            "CIT technicians had to phone the command center for lock codes at every security layer. Wetrack automates secure code delivery and tracking across cash centers and ATM branches - built on CodeIgniter and PostgreSQL with a Kotlin device app. Fewer calls, tighter security, faster routes.",
        imageUrl:
            "https://cit.securiforce.net/app-assets/logo/9a6cefbceff3cf135b0b90cc9058c0c1.png",
        imageVariant: "logo",
        technologies: ["CodeIgniter 3", "PostgreSQL", "Kotlin", "Docker"],
        githubUrl: "",
        liveUrl: "",
        year: 2022,
        role: "Full Stack Developer",
        projectType: "work",
        tags: ["web", "security", "logistics"],
        status: "completed",
        featured: false,
        displayOrder: 8,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 9,
        slug: "fasttrack-system",
        title: "Fasttrack - Client Ordering Portal",
        description:
            "Corporate clients booked cash-in-transit services through calls and paperwork. Fasttrack is a client-facing ordering portal on CodeIgniter 4 and PostgreSQL that streamlines service booking end to end.",
        imageUrl:
            "https://cit.securiforce.net/app-assets/logo/9a6cefbceff3cf135b0b90cc9058c0c1.png",
        imageVariant: "logo",
        technologies: ["CodeIgniter 4", "PostgreSQL", "Kotlin", "Docker"],
        githubUrl: "https://github.com/hafizbahtiar/fasttrack-system",
        liveUrl: "",
        year: 2022,
        role: "Frontend Developer",
        projectType: "work",
        tags: ["web", "b2b", "logistics"],
        status: "completed",
        featured: false,
        displayOrder: 9,
        createdAt: TS,
        updatedAt: TS,
    },
];

export const FALLBACK_EXPERIENCES: Experience[] = [
    {
        id: 1,
        companyName: "Laureate System Solution Sdn Bhd",
        role: "Mobile Developer",
        startDate: "2024-08-01",
        endDate: null,
        isCurrent: true,
        location: "Kuala Lumpur, Malaysia",
        latitude: 3.162812,
        longitude: 101.649956,
        projectIds: [3],
        description:
            "Building Flutter apps for government-grade procurement platforms, integrating with Laravel and PostgreSQL backend services.",
        displayOrder: 1,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 2,
        companyName: "Securiforce Sdn Bhd",
        role: "Programmer",
        startDate: "2022-12-01",
        endDate: "2024-07-01",
        isCurrent: false,
        location: "Kuala Lumpur, Malaysia",
        latitude: 3.169587829506779,
        longitude: 101.69440540132585,
        projectIds: [4, 8, 9],
        description:
            "Delivered security and logistics platforms for cash-in-transit operations - receipt digitization, secure code automation, and client ordering portals.",
        displayOrder: 2,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 3,
        companyName: "Jom Dapur Sdn Bhd",
        role: "Software Engineer",
        startDate: "2020-09-01",
        endDate: "2022-11-01",
        isCurrent: false,
        location: "Kuala Lumpur, Malaysia",
        latitude: 3.2045919219587615,
        longitude: 101.72203100800152,
        projectIds: [5, 6, 7],
        description:
            "Built a food delivery ecosystem end to end: customer and rider apps in React Native, Node.js/Express APIs, and the operations dashboard.",
        displayOrder: 3,
        createdAt: TS,
        updatedAt: TS,
    },
    {
        id: 4,
        companyName: "Associated Testing Laboratory Sdn Bhd",
        role: "Site & Lab Technician",
        startDate: "2019-05-01",
        endDate: "2020-08-01",
        isCurrent: false,
        location: "Kuala Lumpur, Malaysia",
        latitude: 3.196580727512005,
        longitude: 101.67055660869626,
        projectIds: [],
        description:
            "Supported site testing operations and lab instrumentation workflows - where I started automating reports and found my way into software.",
        displayOrder: 4,
        createdAt: TS,
        updatedAt: TS,
    },
];

/** Curated copy + presentation that take precedence over API records. */
export const PROJECT_COPY: Record<
    string,
    { title?: string; description: string; imageVariant?: Project["imageVariant"] }
> = Object.fromEntries(
    FALLBACK_PROJECTS.map((p) => [
        p.slug,
        { title: p.title, description: p.description, imageVariant: p.imageVariant },
    ]),
);

/**
 * Per-slug link overrides - STOPGAP until the structured `project_links` model
 * (admin-managed, status-aware) ships in the admin/backend phase.
 *
 * The production DB still carries links that 404 or no longer resolve. Until an
 * admin can mark a link hidden/disabled, we sanitize them here so the public
 * site never renders a broken "Source Code" / "Live Demo" CTA. An empty string
 * means "hide this CTA". Verified 2026-06-16:
 *   - com-invois: github.com/hafizbahtiar/invoice → 404; Play Store com.invois → 404
 *   - fasttrack-system: github.com/hafizbahtiar/fasttrack-system → 404; fasttrack-system.com → unreachable
 */
export const PROJECT_LINK_OVERRIDES: Record<
    string,
    { githubUrl?: string; liveUrl?: string }
> = {
    "com-invois": { githubUrl: "", liveUrl: "" },
    "fasttrack-system": { githubUrl: "", liveUrl: "" },
};
