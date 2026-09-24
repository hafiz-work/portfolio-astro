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
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
    success:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    warning:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    danger:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
    accent:
        "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
};

const BADGE_DOTS: Record<BadgeVariant, string> = {
    neutral: "bg-slate-400 dark:bg-slate-500",
    info: "bg-blue-500 dark:bg-blue-400",
    success: "bg-emerald-500 dark:bg-emerald-400",
    warning: "bg-amber-500 dark:bg-amber-400",
    danger: "bg-red-500 dark:bg-red-400",
    accent: "bg-cyan-500 dark:bg-cyan-400",
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
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800";

const ACTION_STYLES = {
    default:
        "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50 focus-visible:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-100 dark:hover:bg-slate-700",
    danger:
        "border-red-200 bg-white text-red-500 hover:border-red-300 hover:text-red-700 hover:bg-red-50 focus-visible:ring-red-400 dark:border-red-500/30 dark:bg-slate-800 dark:text-red-400 dark:hover:border-red-500/50 dark:hover:text-red-300 dark:hover:bg-red-500/10",
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
        <span className="block font-medium text-slate-900 dark:text-slate-100">
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
            className={`block text-xs text-slate-500 dark:text-slate-400 ${mono ? "font-mono" : ""}`}
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
            className={`text-sm text-slate-700 dark:text-slate-300 ${mono ? "font-mono text-[13px]" : ""}`}
        >
            {children}
        </span>
    );
}
