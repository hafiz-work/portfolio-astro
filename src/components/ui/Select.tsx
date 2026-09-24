import React, { useEffect, useId, useRef, useState } from 'react';

interface Option {
    value: string | number;
    label: string | number;
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
        <div className={`relative space-y-2 ${className}`} ref={dropdownRef}>
            {label && (
                <label
                    id={labelId}
                    htmlFor={controlId}
                    className="block text-sm font-medium text-slate-500 dark:text-slate-400"
                >
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
                    className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-4 py-2 text-left text-slate-900 dark:text-slate-100 outline-none transition-all flex justify-between items-center group ${isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-500/50'
                        }`}
                >
                    <span className={`text-sm transition-colors truncate ${selectedOption ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <div className="flex items-center text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors ml-2">
                        <svg
                            className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-max min-w-full max-w-[min(92vw,28rem)] mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-xl overflow-hidden backdrop-blur-xl transform origin-top animate-fade-in">
                        <ul className="max-h-60 overflow-y-auto py-1">
                            {options.map((option) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full text-left truncate px-4 py-2 text-sm transition-colors ${option.value === value
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
