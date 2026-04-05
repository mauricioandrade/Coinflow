/**
 * sanitize.ts — XSS protection utilities.
 *
 * Strategy:
 *  1. React escapes all JSX string expressions by default — the primary defence.
 *  2. This module is for the rare case where HTML must be rendered
 *     (e.g., formatted descriptions from the backend).
 *  3. DOMPurify strips anything that could execute: <script>, event handlers,
 *     javascript: URIs, data: URIs, etc.
 *
 * NEVER use dangerouslySetInnerHTML without calling sanitize() first.
 */

import type DOMPurify from "dompurify";

type PurifyInstance = DOMPurify.DOMPurifyI;

let _purify: PurifyInstance | null = null;

async function getPurify(): Promise<PurifyInstance | null> {
  if (typeof window === "undefined") return null;
  if (!_purify) {
    const mod = await import("dompurify");
    _purify = mod.default as unknown as PurifyInstance;
  }
  return _purify;
}

/**
 * Strip all HTML/script content — allow only safe inline tags.
 * Use when rendering user-generated rich text.
 */
export async function sanitizeHtml(dirty: string): Promise<string> {
  const purify = await getPurify();
  if (!purify) {
    // Server-side fallback: strip all tags
    return dirty.replace(/<[^>]*>/g, "");
  }
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br"],
    ALLOWED_ATTR: [],
  });
}

/**
 * Strip ALL HTML — returns plain text only.
 * Use for financial descriptions, transaction notes, etc.
 */
export async function sanitizePlainText(dirty: string): Promise<string> {
  const purify = await getPurify();
  if (!purify) {
    return dirty.replace(/<[^>]*>/g, "");
  }
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
