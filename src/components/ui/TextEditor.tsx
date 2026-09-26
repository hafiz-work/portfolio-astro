import React, { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { marked } from "marked";
import { sanitizeRichHtml } from "../../lib/sanitize";

type TextEditorProps = {
    content: string;
    editable?: boolean;
    showToolbar?: boolean;
    name?: string;
    id?: string;
};

export const TextEditor = ({
    content,
    editable = true,
    showToolbar = true,
    name,
    id,
}: TextEditorProps) => {
    const html = useMemo(
        () => sanitizeRichHtml(String(marked.parse(content || ""))),
        [content],
    );
    const [formValue, setFormValue] = useState(html);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3, 4],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: true,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: {
                    class: "text-sky-300 underline underline-offset-4",
                },
            }),
        ],
        content: html,
        editable,
        onUpdate: ({ editor }) => {
            if (!name) return;
            setFormValue(sanitizeRichHtml(editor.getHTML()));
        },
        editorProps: {
            attributes: {
                class:
                    "prose prose-invert prose-lg max-w-none text-gray-200 leading-relaxed focus:outline-none min-h-[220px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] prose-headings:text-white prose-strong:text-white prose-a:text-sky-300 prose-a:font-medium prose-a:no-underline prose-a:hover:text-sky-200 prose-code:text-sky-300 prose-code:bg-gray-950/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-950/70 prose-pre:border prose-pre:border-sky-500/30 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:font-mono prose-blockquote:border-sky-500/40 prose-blockquote:text-gray-300 prose-hr:border-gray-800",
            },
        },
    });

    useEffect(() => {
        if (!editor) return;
        editor.commands.setContent(html);
        if (name) {
            setFormValue(html);
        }
    }, [editor, html]);

    useEffect(() => {
        if (!editor || !textareaRef.current || !name) return;
        const textarea = textareaRef.current;
        const handleChange = () => {
            const nextValue = textarea.value;
            if (nextValue === formValue) return;
            setFormValue(nextValue);
            editor.commands.setContent(
                sanitizeRichHtml(String(marked.parse(nextValue || ""))),
            );
        };
        textarea.addEventListener("change", handleChange);
        return () => {
            textarea.removeEventListener("change", handleChange);
        };
    }, [editor, formValue, name]);

    if (!editor) return null;

    const iconButtonClass =
        "h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-md border transition-colors";
    const wideButtonClass =
        "h-8 w-10 sm:h-9 sm:w-11 grid place-items-center rounded-md border transition-colors";
    const activeClass = "text-white border-sky-400/60 bg-sky-500/20";
    const inactiveClass =
        "text-gray-400 border-gray-800 hover:text-white hover:border-sky-500/40";

    return (
        <div className="rounded-lg border border-sky-500/20 bg-gray-950 shadow-lg overflow-hidden">
            {name && (
                <textarea
                    ref={textareaRef}
                    id={id}
                    name={name}
                    className="sr-only"
                    value={formValue}
                    readOnly
                />
            )}
            {showToolbar && (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 border-b border-sky-500/20 bg-gray-950/80 px-2 sm:px-3 py-2 overflow-x-auto">
                    <button
                        type="button"
                        aria-label="Bold"
                        className={`${iconButtonClass} ${editor.isActive("bold")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleBold().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M7 5h7a3 3 0 0 1 0 6H7z" />
                            <path d="M7 11h8a3 3 0 0 1 0 6H7z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Italic"
                        className={`${iconButtonClass} ${editor.isActive("italic")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M11 5h6" />
                            <path d="M7 19h6" />
                            <path d="M14 5l-4 14" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Underline"
                        className={`${iconButtonClass} ${editor.isActive("underline")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleUnderline().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M7 5v6a5 5 0 0 0 10 0V5" />
                            <path d="M5 19h14" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Strikethrough"
                        className={`${iconButtonClass} ${editor.isActive("strike")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleStrike().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M16 6a4 4 0 0 0-8 0c0 3 8 2 8 6a4 4 0 0 1-8 0" />
                            <path d="M4 12h16" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Inline code"
                        className={`${iconButtonClass} ${editor.isActive("code")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleCode().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M8 8l-4 4 4 4" />
                            <path d="M16 8l4 4-4 4" />
                        </svg>
                    </button>
                    <div className="h-6 w-px bg-gray-800" />
                    <button
                        type="button"
                        aria-label="Heading 2"
                        className={`${wideButtonClass} ${editor.isActive("heading", { level: 2 })
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 2 })
                                .run()
                        }
                    >
                        <span className="text-[10px] font-semibold tracking-wide">
                            H2
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label="Heading 3"
                        className={`${wideButtonClass} ${editor.isActive("heading", { level: 3 })
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 3 })
                                .run()
                        }
                    >
                        <span className="text-[10px] font-semibold tracking-wide">
                            H3
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label="Bullet list"
                        className={`${iconButtonClass} ${editor.isActive("bulletList")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleBulletList().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M8 6h12" />
                            <path d="M8 12h12" />
                            <path d="M8 18h12" />
                            <circle cx="4" cy="6" r="1" />
                            <circle cx="4" cy="12" r="1" />
                            <circle cx="4" cy="18" r="1" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Numbered list"
                        className={`${iconButtonClass} ${editor.isActive("orderedList")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleOrderedList().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M8 6h12" />
                            <path d="M8 12h12" />
                            <path d="M8 18h12" />
                            <path d="M4 6h1" />
                            <path d="M4 12h1" />
                            <path d="M4 18h1" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Quote"
                        className={`${iconButtonClass} ${editor.isActive("blockquote")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleBlockquote().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M10 6H6v6h4V6z" />
                            <path d="M18 6h-4v6h4V6z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Horizontal rule"
                        className={`${iconButtonClass} ${inactiveClass}`}
                        onClick={() =>
                            editor.chain().focus().setHorizontalRule().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M4 12h16" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Code block"
                        className={`${iconButtonClass} ${editor.isActive("codeBlock")
                            ? activeClass
                            : inactiveClass
                            }`}
                        onClick={() =>
                            editor.chain().focus().toggleCodeBlock().run()
                        }
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M8 6l-4 6 4 6" />
                            <path d="M16 6l4 6-4 6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Link"
                        className={`${iconButtonClass} ${editor.isActive("link") ? activeClass : inactiveClass
                            }`}
                        onClick={() => {
                            const previousUrl =
                                editor.getAttributes("link").href;
                            const url = window.prompt(
                                "Enter URL",
                                previousUrl || "",
                            );
                            if (url === null) return;
                            if (url === "") {
                                editor
                                    .chain()
                                    .focus()
                                    .extendMarkRange("link")
                                    .unsetLink()
                                    .run();
                                return;
                            }
                            editor
                                .chain()
                                .focus()
                                .extendMarkRange("link")
                                .setLink({ href: url })
                                .run();
                        }}
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-2 2" />
                            <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 1 1-7-7l2-2" />
                        </svg>
                    </button>
                    <div className="h-6 w-px bg-gray-800" />
                    <button
                        type="button"
                        aria-label="Undo"
                        className={`${iconButtonClass} ${inactiveClass} disabled:opacity-40`}
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M9 10H4l4-4" />
                            <path d="M4 10h9a7 7 0 1 1 0 14" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Redo"
                        className={`${iconButtonClass} ${inactiveClass} disabled:opacity-40`}
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M15 10h5l-4-4" />
                            <path d="M20 10h-9a7 7 0 1 0 0 14" />
                        </svg>
                    </button>
                </div>
            )}
            <div className="p-4 md:p-6">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};
