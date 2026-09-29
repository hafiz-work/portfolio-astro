import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from "lucide-react";

interface Option {
    value: string | number;
    label: string | number;
    /** Optional leading icon, shown in the trigger and the list. */
    icon?: ReactNode;
}

interface SelectProps {
    value: string | number;
    onChange: (value: string | number) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    label?: string;
    ariaLabel?: string;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Select option",
    className = "",
    label,
    ariaLabel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const labelId = useId();
    const controlId = useId();

    const selectedOption = options.find(opt => opt.value === value);

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

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
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
                    <ul role="listbox" aria-labelledby={label ? labelId : undefined} aria-label={!label ? ariaLabel : undefined} className="menu max-h-60">
                        {options.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={option.value === value}
                                    onClick={() => handleSelect(option.value)}
                                    className="menu-item"
                                >
                                    {option.icon}
                                    <span className="truncate">{option.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
