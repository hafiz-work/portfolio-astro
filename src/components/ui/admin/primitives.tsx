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
    neutral: "bg-gray-950/[0.03] text-gray-700 ring-gray-950/10 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10",
    info: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300 dark:ring-sky-400/25",
    success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-400/25",
    warning: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300 dark:ring-amber-400/25",
    danger: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300 dark:ring-red-400/25",
    accent: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300 dark:ring-sky-400/25",
};

const BADGE_DOTS: Record<BadgeVariant, string> = {
    neutral: "bg-gray-400 dark:bg-gray-400",
    info: "bg-sky-500 dark:bg-sky-400",
    success: "bg-emerald-500 dark:bg-emerald-400",
    warning: "bg-amber-500 dark:bg-amber-400",
    danger: "bg-red-500 dark:bg-red-400",
    accent: "bg-sky-500 dark:bg-sky-400",
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
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]/4 font-medium capitalize whitespace-nowrap ring-1 ring-inset ${BADGE_VARIANTS[variant]}`}
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
    "inline-flex size-8 items-center justify-center rounded-full ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500";

const ACTION_STYLES = {
    default:
        "text-gray-500 ring-gray-950/10 hover:bg-gray-950/[0.03] hover:text-gray-950 dark:text-gray-400 dark:ring-white/15 dark:hover:bg-white/5 dark:hover:text-white",
    danger:
        "text-red-600 ring-red-500/30 hover:bg-red-500/10 dark:text-red-400",
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
