import { isTag, isText, type ChildNode, type Element } from "domhandler";
import { escapeAttribute, escapeText } from "entities";
import { parseDocument } from "htmlparser2";

const ALLOWED_TAGS = new Set([
  "a",
  "aside",
  "blockquote",
  "br",
  "code",
  "col",
  "colgroup",
  "del",
  "details",
  "div",
  "em",
  "h2",
  "h3",
  "h4",
  "hr",
  "iframe",
  "input",
  "label",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const VOID_TAGS = new Set(["br", "col", "hr", "input"]);

const ALLOWED_ATTRS = new Map<string, Set<string>>([
  ["a", new Set(["href", "name", "target", "rel", "class"])],
  ["code", new Set(["class"])],
  ["p", new Set(["class"])],
  ["pre", new Set(["class"])],
  ["span", new Set(["class"])],
  ["table", new Set(["class"])],
  ["td", new Set(["colspan", "rowspan", "class"])],
  ["th", new Set(["colspan", "rowspan", "class"])],
  ["iframe", new Set(["src", "width", "height"])],
  ["input", new Set(["type", "checked"])],
]);

// Editor presets (spacing, align, callouts, task lists, details, embeds).
// Allowed on any allowed tag, but only with these exact values - never free CSS.
const PRESET_ATTRS: Record<string, RegExp> = {
  "data-spacing": /^(tight|loose)$/,
  "data-align": /^(center|right)$/,
  "data-callout": /^(info|tip|warning)$/,
  "data-type": /^(taskList|taskItem|detailsContent)$/,
  "data-checked": /^(true|false)$/,
  "data-youtube-video": /^$/,
};

const YOUTUBE_EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+(\?[\w=&%.-]*)?$/;

const SAFE_HREF_PATTERN = /^(https?:|mailto:|tel:|#|\/(?!\/))/i;
const DROPPED_CONTENT_TAGS = new Set(["script", "style"]);

const renderAttrs = (node: Element, tagName: string): string => {
  const allowedAttrs = ALLOWED_ATTRS.get(tagName) ?? new Set<string>();
  const attrs: string[] = [];

  for (const [rawName, rawValue] of Object.entries(node.attribs)) {
    const name = rawName.toLowerCase();
    const value = rawValue.trim();

    if (name in PRESET_ATTRS) {
      if (PRESET_ATTRS[name].test(value)) {
        attrs.push(value ? `${name}="${escapeAttribute(value)}"` : name);
      }
      continue;
    }

    if (!allowedAttrs.has(name) || name.startsWith("on")) {
      continue;
    }

    if (name === "src" && !YOUTUBE_EMBED.test(value)) {
      continue;
    }

    if ((name === "width" || name === "height") && !/^\d{1,4}$/.test(value)) {
      continue;
    }

    if (name === "type" && value !== "checkbox") {
      continue;
    }

    if (name === "href" && !SAFE_HREF_PATTERN.test(value)) {
      continue;
    }

    if (tagName === "a" && name === "rel") {
      continue;
    }

    attrs.push(`${name}="${escapeAttribute(value)}"`);
  }

  if (tagName === "a") {
    attrs.push('rel="noopener noreferrer"');
  }

  // Published task lists are read-only.
  if (tagName === "input") {
    attrs.push("disabled");
  }

  if (tagName === "iframe") {
    attrs.push(
      'loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"',
    );
  }

  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
};

const renderNode = (node: ChildNode): string => {
  if (isText(node)) {
    return escapeText(node.data);
  }

  if (!isTag(node)) {
    return "";
  }

  const tagName = node.name.toLowerCase();
  if (DROPPED_CONTENT_TAGS.has(tagName)) {
    return "";
  }

  const children = node.children.map(renderNode).join("");
  if (!ALLOWED_TAGS.has(tagName)) {
    return children;
  }

  // An embed or checkbox that failed validation is dropped entirely.
  if (tagName === "iframe" && !YOUTUBE_EMBED.test(node.attribs.src?.trim() ?? "")) {
    return "";
  }
  if (tagName === "input" && node.attribs.type !== "checkbox") {
    return "";
  }

  const attrs = renderAttrs(node, tagName);
  if (tagName === "iframe") {
    return `<iframe${attrs}></iframe>`;
  }
  if (VOID_TAGS.has(tagName)) {
    return `<${tagName}${attrs}>`;
  }

  return `<${tagName}${attrs}>${children}</${tagName}>`;
};

export const sanitizeRichHtml = (html: string): string => {
  const document = parseDocument(html, {
    decodeEntities: true,
    lowerCaseAttributeNames: true,
    lowerCaseTags: true,
  });

  return document.children.map(renderNode).join("");
};

const BLOCK_TAGS = new Set(["p", "div", "li", "br", "h2", "h3", "h4", "blockquote", "pre", "tr", "aside", "summary"]);

/**
 * Rich-text HTML (TextEditor output) → plain text, for places that must stay
 * inline or short (e.g. inside a <button>). Plain-text input passes through.
 * The result is text, so render it with normal `{}` escaping - never set:html.
 */
export const toPlainText = (html: string): string => {
  const walk = (node: ChildNode): string => {
    if (isText(node)) return node.data;
    if (!isTag(node) || DROPPED_CONTENT_TAGS.has(node.name)) return "";
    const inner = node.children.map(walk).join("");
    return BLOCK_TAGS.has(node.name) ? ` ${inner} ` : inner;
  };
  return parseDocument(html, { decodeEntities: true }).children.map(walk).join("").replace(/\s+/g, " ").trim();
};

export const serializeJsonForHtml = (value: unknown): string => {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
};
