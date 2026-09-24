import React, { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../ui/DataTable";
import {
    AdminBadge,
    statusBadgeVariant,
    CellPrimary,
    CellSecondary,
    CellText,
    RowActions,
    ViewAction,
} from "../../ui/admin/primitives";
import { contactService, type OwnerContact } from "../../../lib/contact";

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};

const truncate = (value: string, length: number) => {
    if (value.length <= length) return value;
    return `${value.slice(0, length).trim()}...`;
};

export const ContactsTable = () => {
    const [data, setData] = useState<OwnerContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<OwnerContact | null>(
        null
    );
    const [statusUpdating, setStatusUpdating] = useState(false);

    const updateStatus = async (
        contact: OwnerContact,
        status: "READ" | "REPLIED" | "ARCHIVED",
    ) => {
        setStatusUpdating(true);
        try {
            const updated = await contactService.updateContactStatus(
                contact.id,
                status,
            );
            const next = updated ?? { ...contact, status };
            setData((prev) =>
                prev.map((row) => (row.id === contact.id ? { ...row, ...next } : row)),
            );
            setSelectedContact((prev) =>
                prev && prev.id === contact.id ? { ...prev, ...next } : prev,
            );
        } catch (error) {
            console.error("Failed to update contact status:", error);
            alert("Couldn't update the message status. Please try again.");
        } finally {
            setStatusUpdating(false);
        }
    };

    useEffect(() => {
        const loadContacts = async () => {
            try {
                const contacts = await contactService.getOwnerContacts();
                setData(contacts);
            } catch (error) {
                console.error("Failed to load contacts:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadContacts();
    }, []);

    const columns: ColumnDef<OwnerContact>[] = [
        {
            accessorKey: "name",
            header: "Sender",
            cell: ({ row }) => (
                <div className="min-w-0">
                    <CellPrimary>{row.original.name}</CellPrimary>
                    <CellSecondary mono>{row.original.email}</CellSecondary>
                </div>
            ),
        },
        {
            accessorKey: "subject",
            header: "Subject",
            cell: ({ row }) => (
                <div className="min-w-0">
                    <CellText>{row.original.subject}</CellText>
                    <CellSecondary>{truncate(row.original.message, 80)}</CellSecondary>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <AdminBadge variant={statusBadgeVariant(row.original.status)} dot>
                    {row.original.status.toLowerCase()}
                </AdminBadge>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Received",
            cell: ({ row }) => (
                <CellText mono>{formatDate(row.original.createdAt)}</CellText>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <RowActions>
                    <ViewAction
                        onClick={() => setSelectedContact(row.original)}
                        label={`View message from ${row.original.name}`}
                    />
                </RowActions>
            ),
        },
    ];

    return (
        <>
            <DataTable columns={columns} data={data} isLoading={isLoading} />

            {selectedContact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Close modal"
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setSelectedContact(null)}
                    />
                    <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="space-y-1">
                                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-mono uppercase tracking-wider">
                                    Contact Details
                                </p>
                                <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
                                    {selectedContact.subject}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedContact(null)}
                                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                aria-label="Close contact details"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    ></path>
                                </svg>
                            </button>
                        </div>
                        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">FROM</p>
                                    <p className="text-slate-900 dark:text-slate-100">{selectedContact.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                        {selectedContact.email}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">STATUS</p>
                                    <AdminBadge variant={statusBadgeVariant(selectedContact.status)} dot>
                                        {selectedContact.status.toLowerCase()}
                                    </AdminBadge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">PHONE</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {selectedContact.phone || "—"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">RECEIVED</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                                        {formatDate(selectedContact.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">MESSAGE</p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                                    {selectedContact.message}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex flex-wrap items-center gap-2">
                                {(["READ", "REPLIED", "ARCHIVED"] as const).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        disabled={statusUpdating || selectedContact.status === status}
                                        onClick={() => updateStatus(selectedContact, status)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                                    >
                                        {status === "READ" ? "Mark read" : status === "REPLIED" ? "Mark replied" : "Archive"}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:text-slate-900 hover:border-slate-400 transition-colors dark:text-slate-300 dark:border-slate-600 dark:hover:text-white dark:hover:border-slate-400"
                                onClick={() => setSelectedContact(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
