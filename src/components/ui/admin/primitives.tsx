import React from "react";
import { Pencil, Trash2, Eye, type LucideIcon } from "lucide-react";

/**
 * Shared admin UI primitives - badges, row action buttons, cell text.
 * Every admin table/list must use these instead of ad-hoc spans so the
 * admin reads as one system in both light and dark mode.
 */

// ── Badges ────────────────────────────────────────────────────────────────

export type BadgeVariant =
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "accent";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
    neutral:
        "bg-gray-950/[0.03] text-gray-700 border-gray-950/5 dark:bg-white/10 dark:text-gray-300 dark:border-white/10",
    info: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
    success:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    warning:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    danger:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
    accent:
        "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
};

const BADGE_DOTS: Record<BadgeVariant, string> = {
    neutral: "bg-gray-400 dark:bg-gray-400",
    info: "bg-sky-500 dark:bg-sky-400",
    success: "bg-emerald-500 dark:bg-emerald-400",
    warning: "bg-amber-500 dark:bg-amber-400",
    danger: "bg-red-500 dark:bg-red-400",
    accent: "bg-sky-500/100 dark:bg-sky-400",
};

export function AdminBadge({
    variant = "neutral",
    dot = false,
    children,
}: {
    variant?: BadgeVariant;
    dot?: boolean;
    children: React.ReactNode;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap ${BADGE_VARIANTS[variant]}`}
        >
            {dot && (
                <span
                    className={`h-1.5 w-1.5 rounded-full ${BADGE_DOTS[variant]}`}
                    aria-hidden="true"
                />
            )}
            {children}
        </span>
    );
}

/** Maps common content statuses to badge variants. */
export const statusBadgeVariant = (status: string | null | undefined): BadgeVariant => {
    switch ((status ?? "").toLowerCase()) {
        case "completed":
        case "published":
        case "public":
        case "replied":
            return "success";
        case "in-progress":
        case "draft":
        case "new":
            return "warning";
        case "maintained":
        case "read":
            return "info";
        default:
            return "neutral";
    }
};

// ── Row action buttons ────────────────────────────────────────────────────

const ACTION_BASE =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-pub-dark";

const ACTION_STYLES = {
    default:
        "border-gray-950/5 bg-white text-gray-500 hover:border-gray-950/15 hover:text-gray-950 hover:bg-gray-950/[0.025] focus-visible:ring-sky-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white dark:hover:bg-white/10",
    danger:
        "border-red-200 bg-white text-red-500 hover:border-red-300 hover:text-red-700 hover:bg-red-50 focus-visible:ring-red-400 dark:border-red-500/30 dark:bg-white/[0.03] dark:text-red-400 dark:hover:border-red-500/50 dark:hover:text-red-300 dark:hover:bg-red-500/10",
};

type ActionProps = {
    label: string;
    icon?: LucideIcon;
    variant?: keyof typeof ACTION_STYLES;
} & (
    | { href: string; onClick?: never }
    | { href?: never; onClick: () => void }
);

export function AdminAction({
    label,
    icon: Icon = Pencil,
    variant = "default",
    href,
    onClick,
}: ActionProps) {
    const className = `${ACTION_BASE} ${ACTION_STYLES[variant]}`;
    const content = <Icon className="h-4 w-4" aria-hidden="true" />;
    if (href) {
        return (
            <a href={href} className={className} aria-label={label} title={label}>
                {content}
            </a>
        );
    }
    return (
        <button
            type="button"
            onClick={onClick}
            className={className}
            aria-label={label}
            title={label}
        >
            {content}
        </button>
    );
}

export function EditAction({ href, label }: { href: string; label: string }) {
    return <AdminAction href={href} label={label} icon={Pencil} />;
}

export function DeleteAction({
    onClick,
    label,
}: {
    onClick: () => void;
    label: string;
}) {
    return <AdminAction onClick={onClick} label={label} icon={Trash2} variant="danger" />;
}

export function ViewAction({
    onClick,
    label,
}: {
    onClick: () => void;
    label: string;
}) {
    return <AdminAction onClick={onClick} label={label} icon={Eye} />;
}

export function RowActions({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}

// ── Cell text helpers ─────────────────────────────────────────────────────

export function CellPrimary({ children }: { children: React.ReactNode }) {
    return (
        <span className="block font-medium text-gray-950 dark:text-white">
            {children}
        </span>
    );
}

export function CellSecondary({
    children,
    mono = false,
}: {
    children: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <span
            className={`block text-xs text-gray-500 dark:text-gray-400 ${mono ? "font-mono" : ""}`}
        >
            {children}
        </span>
    );
}

export function CellText({
    children,
    mono = false,
}: {
    children: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <span
            className={`text-sm text-gray-700 dark:text-gray-300 ${mono ? "font-mono text-[13px]" : ""}`}
        >
            {children}
        </span>
    );
}
