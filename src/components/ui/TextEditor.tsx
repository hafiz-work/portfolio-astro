import React, { useEffect, useRef, type ReactNode } from "react";
import {
    EditorContent,
    Extension,
    Node,
    useEditor,
    useEditorState,
    type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { marked } from "marked";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Code,
    Highlighter,
    Italic,
    Link,
    List,
    ListCollapse,
    ListOrdered,
    ListTodo,
    Minus,
    Redo2,
    RemoveFormatting,
    SquareCode,
    Strikethrough,
    Table,
    TextQuote,
    Underline,
    Undo2,
    Youtube as YoutubeIcon,
} from "lucide-react";
import { sanitizeRichHtml } from "../../lib/sanitize";

type TextEditorProps = {
    content: string;
    editable?: boolean;
    showToolbar?: boolean;
    name?: string;
    id?: string;
    placeholder?: string;
};

// Stored bodies can be Markdown or HTML. In the editor, single newlines are
// real line breaks (`breaks`), then split into paragraphs below.
const toHtml = (value: string, breaks: boolean) =>
    sanitizeRichHtml(String(marked.parse(value || "", { breaks })));

// A <br>-joined paragraph is one block to ProseMirror, so "bullet this line"
// would wrap every line. Give each line its own paragraph on load.
const splitHardBreaks = (editor: Editor) => {
    const positions: number[] = [];
    editor.state.doc.descendants((node, pos, parent) => {
        if (node.type.name === "hardBreak" && parent?.type.name === "paragraph")
            positions.push(pos);
    });
    if (!positions.length) return;
    const tr = editor.state.tr;
    for (const pos of positions.reverse()) tr.delete(pos, pos + 1).split(pos);
    editor.view.dispatch(tr.setMeta("addToHistory", false));
};

// Spacing/align are fixed presets stored as data-* (the sanitizer only lets
// these exact values through) - styled once in index.css for editor + blog.
const Presets = Extension.create({
    name: "presets",
    addGlobalAttributes() {
        const attr = (name: string) => ({
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`),
            renderHTML: (attrs: Record<string, string | null>) =>
                attrs[name] ? { [`data-${name}`]: attrs[name] } : {},
        });
        return [
            {
                types: ["paragraph", "heading"],
                attributes: { spacing: attr("spacing"), align: attr("align") },
            },
        ];
    },
});

const Callout = Node.create({
    name: "callout",
    group: "block",
    content: "block+",
    defining: true,
    addAttributes() {
        return {
            variant: {
                default: "info",
                parseHTML: (el) => el.getAttribute("data-callout"),
                renderHTML: (attrs) => ({ "data-callout": attrs.variant }),
            },
        };
    },
    parseHTML() {
        return [{ tag: "aside[data-callout]" }];
    },
    renderHTML({ HTMLAttributes }) {
        return ["aside", HTMLAttributes, 0];
    },
});

const SPACINGS = [
    { value: "", label: "Normal spacing" },
    { value: "tight", label: "Tight spacing" },
    { value: "loose", label: "Loose spacing" },
] as const;

const CALLOUTS = [
    { value: "", label: "No callout" },
    { value: "info", label: "Info callout" },
    { value: "tip", label: "Tip callout" },
    { value: "warning", label: "Warning callout" },
] as const;

const SELECT =
    "h-8 shrink-0 cursor-pointer rounded-md bg-transparent pl-2 pr-7 text-sm font-medium text-gray-700 hover:bg-gray-950/5 focus:outline-2 focus:outline-sky-500 dark:text-gray-200 dark:hover:bg-white/10 [&>option]:bg-canvas dark:[&>option]:bg-pub-dark";

const TEXT_BUTTON =
    "h-8 shrink-0 rounded-md px-2 text-xs font-medium text-gray-600 hover:bg-gray-950/5 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white";

const MOD =
    typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform)
        ? "⌘"
        : "Ctrl+";

const BLOCKS = [
    { value: "p", label: "Paragraph" },
    { value: "2", label: "Heading 2" },
    { value: "3", label: "Heading 3" },
    { value: "4", label: "Heading 4" },
] as const;

const ToolButton = ({
    label,
    shortcut,
    active = false,
    disabled = false,
    onClick,
    children,
}: {
    label: string;
    shortcut?: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) => (
    <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={shortcut ? `${label} (${shortcut})` : label}
        disabled={disabled}
        // Keep the editor selection - a toolbar click must not steal focus.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 ${active
            ? "bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300"
            : "text-gray-500 hover:bg-gray-950/5 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
    >
        {children}
    </button>
);

const Divider = () => (
    <span
        aria-hidden="true"
        className="mx-1 h-5 w-px shrink-0 bg-gray-950/10 dark:bg-white/10"
    />
);

const ICON = { className: "size-4", strokeWidth: 2 };

export const TextEditor = ({
    content,
    editable = true,
    showToolbar = true,
    name,
    id,
    placeholder = "Start writing…",
}: TextEditorProps) => {
    const initialHtml = toHtml(content, editable);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const lastWritten = useRef(initialHtml);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3, 4] },
                link: {
                    openOnClick: !editable,
                    autolink: true,
                    linkOnPaste: true,
                    HTMLAttributes: {
                        class: "text-sky-600 dark:text-sky-300 underline underline-offset-4",
                    },
                },
            }),
            Placeholder.configure({ placeholder }),
            CharacterCount,
            Presets,
            Callout,
            Highlight,
            TaskList,
            TaskItem.configure({ nested: true }),
            Details,
            DetailsSummary,
            DetailsContent,
            TableKit.configure({ table: { resizable: false } }),
            Youtube.configure({ nocookie: true, width: 640, height: 360 }),
        ],
        content: initialHtml,
        editable,
        onCreate: ({ editor }) => {
            if (!editable) return;
            // The edit page may have filled the textarea before we mounted.
            const pending = textareaRef.current?.value;
            if (pending && pending !== initialHtml) {
                lastWritten.current = pending;
                editor.commands.setContent(toHtml(pending, true), {
                    emitUpdate: false,
                });
            }
            splitHardBreaks(editor);
        },
        onUpdate: ({ editor }) => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            lastWritten.current = sanitizeRichHtml(editor.getHTML());
            textarea.value = lastWritten.current;
            // form-guard listens for `input` on the form.
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        },
        editorProps: {
            attributes: {
                class:
                    "prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-200 leading-relaxed focus:outline-none min-h-[220px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] prose-headings:text-gray-950 dark:prose-headings:text-white prose-strong:text-gray-950 dark:prose-strong:text-white prose-a:text-sky-600 dark:prose-a:text-sky-300 prose-a:font-medium prose-a:no-underline prose-a:hover:text-sky-500 dark:prose-a:hover:text-sky-200 prose-code:text-sky-700 dark:prose-code:text-sky-300 prose-code:bg-gray-100 dark:prose-code:bg-gray-950/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-950 prose-pre:text-gray-200 dark:prose-pre:bg-white/4 prose-pre:border prose-pre:border-gray-950/5 dark:prose-pre:border-white/10 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:font-mono prose-blockquote:border-sky-500/40 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300 prose-hr:border-gray-200 dark:prose-hr:border-gray-800",
            },
        },
    });

    // Pages load existing posts by setting the textarea and firing `change`.
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!editor || !textarea) return;
        const handleChange = () => {
            if (textarea.value === lastWritten.current) return;
            lastWritten.current = textarea.value;
            editor.commands.setContent(toHtml(textarea.value, true), {
                emitUpdate: false,
            });
            splitHardBreaks(editor);
        };
        textarea.addEventListener("change", handleChange);
        return () => textarea.removeEventListener("change", handleChange);
    }, [editor]);

    // v3 doesn't re-render on every transaction - select toolbar state explicitly.
    const state = useEditorState({
        editor,
        selector: ({ editor }) =>
            editor && {
                bold: editor.isActive("bold"),
                italic: editor.isActive("italic"),
                underline: editor.isActive("underline"),
                strike: editor.isActive("strike"),
                code: editor.isActive("code"),
                bulletList: editor.isActive("bulletList"),
                orderedList: editor.isActive("orderedList"),
                blockquote: editor.isActive("blockquote"),
                codeBlock: editor.isActive("codeBlock"),
                link: editor.isActive("link"),
                highlight: editor.isActive("highlight"),
                taskList: editor.isActive("taskList"),
                details: editor.isActive("details"),
                table: editor.isActive("table"),
                callout: editor.isActive("callout")
                    ? (editor.getAttributes("callout").variant as string)
                    : "",
                spacing:
                    (editor.getAttributes("paragraph").spacing ??
                        editor.getAttributes("heading").spacing ??
                        "") as string,
                align:
                    (editor.getAttributes("paragraph").align ??
                        editor.getAttributes("heading").align ??
                        "") as string,
                block:
                    BLOCKS.find(
                        (b) =>
                            b.value !== "p" &&
                            editor.isActive("heading", { level: Number(b.value) }),
                    )?.value ?? "p",
                canUndo: editor.can().undo(),
                canRedo: editor.can().redo(),
                words: editor.storage.characterCount.words() as number,
                characters: editor.storage.characterCount.characters() as number,
            },
    });

    // Rendered before the editor exists so the edit page can always find it.
    const textarea = name ? (
        <textarea
            ref={textareaRef}
            id={id}
            name={name}
            className="sr-only"
            defaultValue={initialHtml}
            tabIndex={-1}
            aria-hidden="true"
        />
    ) : null;

    // `state` stays null until the first transaction - defaults below cover it.
    if (!editor) return textarea;

    const chain = () => editor.chain().focus();

    const setBlock = (value: string) => {
        if (value === "p") chain().setParagraph().run();
        else chain().toggleHeading({ level: Number(value) as 2 | 3 | 4 }).run();
    };

    // Applies to whichever of paragraph/heading the selection covers.
    const setPreset = (key: "spacing" | "align", value: string) =>
        chain()
            .updateAttributes("paragraph", { [key]: value || null })
            .updateAttributes("heading", { [key]: value || null })
            .run();

    const setCallout = (variant: string) => {
        if (!variant) chain().lift("callout").run();
        else if (editor.isActive("callout"))
            chain().updateAttributes("callout", { variant }).run();
        else chain().wrapIn("callout", { variant }).run();
    };

    const addVideo = () => {
        const url = window.prompt("YouTube URL");
        if (url && !editor.commands.setYoutubeVideo({ src: url.trim() }))
            window.alert("That doesn't look like a YouTube link.");
    };

    const editLink = () => {
        const previous = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL (leave empty to remove)", previous ?? "https://");
        if (url === null) return;
        if (url.trim() === "") chain().extendMarkRange("link").unsetLink().run();
        else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
    };

    if (!editable || !showToolbar) {
        return (
            <>
                {textarea}
                <EditorContent editor={editor} />
            </>
        );
    }

    return (
        <div className="rounded-lg border border-gray-950/10 bg-white dark:border-white/10 dark:bg-white/5">
            {textarea}
            <div
                role="toolbar"
                aria-label="Formatting"
                className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-gray-950/10 bg-canvas/95 px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-pub-dark/95"
            >
                <ToolButton label="Undo" shortcut={`${MOD}Z`} disabled={!state?.canUndo} onClick={() => chain().undo().run()}>
                    <Undo2 {...ICON} />
                </ToolButton>
                <ToolButton label="Redo" shortcut={`${MOD}Shift+Z`} disabled={!state?.canRedo} onClick={() => chain().redo().run()}>
                    <Redo2 {...ICON} />
                </ToolButton>
                <Divider />
                <select
                    aria-label="Text style"
                    value={state?.block ?? "p"}
                    onChange={(e) => setBlock(e.target.value)}
                    className={SELECT}
                >
                    {BLOCKS.map((b) => (
                        <option key={b.value} value={b.value}>
                            {b.label}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Line spacing"
                    value={state?.spacing ?? ""}
                    onChange={(e) => setPreset("spacing", e.target.value)}
                    className={SELECT}
                >
                    {SPACINGS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <ToolButton label="Align left" active={!state?.align} onClick={() => setPreset("align", "")}>
                    <AlignLeft {...ICON} />
                </ToolButton>
                <ToolButton label="Align center" active={state?.align === "center"} onClick={() => setPreset("align", "center")}>
                    <AlignCenter {...ICON} />
                </ToolButton>
                <ToolButton label="Align right" active={state?.align === "right"} onClick={() => setPreset("align", "right")}>
                    <AlignRight {...ICON} />
                </ToolButton>
                <Divider />
                <ToolButton label="Bold" shortcut={`${MOD}B`} active={state?.bold} onClick={() => chain().toggleBold().run()}>
                    <Bold {...ICON} />
                </ToolButton>
                <ToolButton label="Italic" shortcut={`${MOD}I`} active={state?.italic} onClick={() => chain().toggleItalic().run()}>
                    <Italic {...ICON} />
                </ToolButton>
                <ToolButton label="Underline" shortcut={`${MOD}U`} active={state?.underline} onClick={() => chain().toggleUnderline().run()}>
                    <Underline {...ICON} />
                </ToolButton>
                <ToolButton label="Strikethrough" shortcut={`${MOD}Shift+S`} active={state?.strike} onClick={() => chain().toggleStrike().run()}>
                    <Strikethrough {...ICON} />
                </ToolButton>
                <ToolButton label="Inline code" shortcut={`${MOD}E`} active={state?.code} onClick={() => chain().toggleCode().run()}>
                    <Code {...ICON} />
                </ToolButton>
                <ToolButton label="Highlight" shortcut={`${MOD}Shift+H`} active={state?.highlight} onClick={() => chain().toggleHighlight().run()}>
                    <Highlighter {...ICON} />
                </ToolButton>
                <ToolButton label="Link" active={state?.link} onClick={editLink}>
                    <Link {...ICON} />
                </ToolButton>
                <Divider />
                <ToolButton label="Bulleted list" shortcut={`${MOD}Shift+8`} active={state?.bulletList} onClick={() => chain().toggleBulletList().run()}>
                    <List {...ICON} />
                </ToolButton>
                <ToolButton label="Numbered list" shortcut={`${MOD}Shift+7`} active={state?.orderedList} onClick={() => chain().toggleOrderedList().run()}>
                    <ListOrdered {...ICON} />
                </ToolButton>
                <ToolButton label="Task list" shortcut={`${MOD}Shift+9`} active={state?.taskList} onClick={() => chain().toggleTaskList().run()}>
                    <ListTodo {...ICON} />
                </ToolButton>
                <ToolButton label="Quote" shortcut={`${MOD}Shift+B`} active={state?.blockquote} onClick={() => chain().toggleBlockquote().run()}>
                    <TextQuote {...ICON} />
                </ToolButton>
                <ToolButton label="Code block" shortcut={`${MOD}Alt+C`} active={state?.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
                    <SquareCode {...ICON} />
                </ToolButton>
                <ToolButton label="Divider" onClick={() => chain().setHorizontalRule().run()}>
                    <Minus {...ICON} />
                </ToolButton>
                <Divider />
                <select
                    aria-label="Callout"
                    value={state?.callout ?? ""}
                    onChange={(e) => setCallout(e.target.value)}
                    className={SELECT}
                >
                    {CALLOUTS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <ToolButton label="Collapsible section" active={state?.details} onClick={() => (state?.details ? chain().unsetDetails().run() : chain().setDetails().run())}>
                    <ListCollapse {...ICON} />
                </ToolButton>
                <ToolButton label="Insert table" active={state?.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                    <Table {...ICON} />
                </ToolButton>
                <ToolButton label="YouTube video" onClick={addVideo}>
                    <YoutubeIcon {...ICON} />
                </ToolButton>
                <Divider />
                <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
                    <RemoveFormatting {...ICON} />
                </ToolButton>
                {state?.table && (
                    <div className="flex w-full flex-wrap items-center gap-0.5 border-t border-gray-950/5 pt-1 dark:border-white/10">
                        <span className="px-2 font-mono text-xs text-gray-500 dark:text-gray-400">Table</span>
                        <button type="button" className={TEXT_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().addRowAfter().run()}>+ Row</button>
                        <button type="button" className={TEXT_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().addColumnAfter().run()}>+ Column</button>
                        <button type="button" className={TEXT_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteRow().run()}>− Row</button>
                        <button type="button" className={TEXT_BUTTON} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteColumn().run()}>− Column</button>
                        <button type="button" className={`${TEXT_BUTTON} text-red-600 dark:text-red-400`} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteTable().run()}>Delete table</button>
                    </div>
                )}
            </div>
            <div className="px-4 py-4 md:px-6 md:py-5">
                <EditorContent editor={editor} />
            </div>
            <div className="flex justify-end gap-3 rounded-b-lg border-t border-gray-950/10 px-4 py-1.5 font-mono text-xs/5 text-gray-500 dark:border-white/10 dark:text-gray-400">
                <span>{state?.words ?? 0} words</span>
                <span>{state?.characters ?? 0} characters</span>
            </div>
        </div>
    );
};
