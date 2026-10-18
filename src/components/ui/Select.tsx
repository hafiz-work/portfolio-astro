import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Search } from "lucide-react";

interface Option {
    value: string | number;
    label: string | number;
    /** Optional leading icon, shown in the trigger and the list. */
    icon?: ReactNode;
    /** Small grey text on the right of the row (e.g. "1M ctx"). Also matched by search. */
    hint?: string;
    /** Shown but not pickable (with `hint` saying why). */
    disabled?: boolean;
}

interface SelectProps {
    value: string | number;
    onChange: (value: string | number) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    label?: string;
    ariaLabel?: string;
    /** Search box at the top of the menu (long lists). ↑ ↓ move, Enter picks. */
    searchable?: boolean;
    searchPlaceholder?: string;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Select option",
    className = "",
    label,
    ariaLabel,
    searchable = false,
    searchPlaceholder = "Search…",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    // Menu is position: fixed next to the trigger, so a table/card with overflow (DataTable's
    // overflow-x-auto) can't clip it. Opens upward when there's no room below.
    // ponytail: an ancestor with transform/filter would re-anchor it - none in admin today.
    const [pos, setPos] = useState<React.CSSProperties>({});
    const listRef = useRef<HTMLUListElement>(null);
    const labelId = useId();
    const controlId = useId();

    const selectedOption = options.find(opt => opt.value === value);
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => `${o.label} ${o.value} ${o.hint ?? ""}`.toLowerCase().includes(q));
    }, [options, query]);
    const pickable = shown.filter((o) => !o.disabled);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fresh search each time it opens; the selected row starts active.
    useEffect(() => {
        if (!isOpen) return;
        setQuery("");
        setActive(Math.max(0, options.filter((o) => !o.disabled).findIndex((o) => o.value === value)));
    }, [isOpen]);
    useLayoutEffect(() => {
        if (!isOpen) return;
        const place = () => {
            const r = triggerRef.current?.getBoundingClientRect();
            if (!r) return;
            const below = window.innerHeight - r.bottom;
            const up = below < (searchable ? 320 : 240) && r.top > below;
            setPos({
                position: "fixed",
                left: r.left,
                minWidth: r.width,
                marginTop: 0,
                ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
            });
        };
        place();
        // Follow the trigger when the page or a scroll container moves.
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [isOpen, searchable]);
    useEffect(() => {
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    }, [active, isOpen]);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const onSearchKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (pickable.length ? (i + step + pickable.length) % pickable.length : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const o = pickable[active];
            if (o) handleSelect(o.value);
        }
    };

    return (
        <div
            className={`relative space-y-2 ${className}`}
            ref={dropdownRef}
            onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
        >
            {label && (
                <label id={labelId} htmlFor={controlId} className="admin-label">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    id={controlId}
                    ref={triggerRef}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={!label ? ariaLabel : undefined}
                    aria-labelledby={label ? labelId : undefined}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    className="field field-trigger"
                >
                    <span className={`inline-flex min-w-0 items-center gap-2 ${selectedOption ? "" : "text-gray-400 dark:text-gray-500"}`}>
                        {selectedOption?.icon}
                        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                    <div className={searchable ? "menu flex max-h-80 flex-col overflow-hidden p-0" : undefined} style={searchable ? pos : undefined}>
                        {searchable && (
                            <label className="relative block border-b border-gray-950/5 p-1 dark:border-white/10">
                                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                                <input
                                    type="search"
                                    autoFocus
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                                    onKeyDown={onSearchKey}
                                    placeholder={searchPlaceholder}
                                    aria-label={searchPlaceholder}
                                    className="w-full rounded-lg bg-transparent py-1.5 pr-2 pl-8 text-sm/6 text-gray-950 outline-none placeholder:text-gray-400 dark:text-white"
                                />
                            </label>
                        )}
                        <ul
                            ref={listRef}
                            role="listbox"
                            aria-labelledby={label ? labelId : undefined}
                            aria-label={!label ? ariaLabel : undefined}
                            className={searchable ? "min-h-0 flex-1 overflow-y-auto p-1 scrollbar-thin" : "menu max-h-60"}
                            style={searchable ? undefined : pos}
                        >
                            {searchable && !shown.length && <li className="admin-help px-2.5 py-1.5">No match for "{query}".</li>}
                            {shown.map((option) => {
                                const isActive = searchable && !option.disabled && pickable[active]?.value === option.value;
                                return (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={option.value === value}
                                            aria-disabled={option.disabled || undefined}
                                            disabled={option.disabled}
                                            data-active={isActive || undefined}
                                            onClick={() => handleSelect(option.value)}
                                            className={`menu-item disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? "bg-gray-950/5 dark:bg-white/5" : ""}`}
                                        >
                                            {option.icon}
                                            <span className="truncate">{option.label}</span>
                                            {option.hint && <span className="ml-auto shrink-0 pl-3 text-xs text-gray-500 dark:text-gray-400">{option.hint}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
