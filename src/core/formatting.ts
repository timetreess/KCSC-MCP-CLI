const ENTITY_MAP: Readonly<Record<string, string>> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  plusmn: "±",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™"
};

/**
 * Splits a user query into comparable search terms. Terms are lowercased so callers can match them
 * against lowercased text directly; splitting and casing live here so search and clause ranking cannot
 * drift apart on what counts as one term.
 */
export function tokenizeQuery(query: string): readonly string[] {
  return query
    .replace(/[()\[\]{}"']/g, " ")
    .split(/[\s,，·/]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 0);
}

export function normalizeHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<img\b[^>]*>/gi, toImagePlaceholder)
      .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, content: string) => `^${stripTags(content)}`)
      .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_, content: string) => `_${stripTags(content)}`)
      .replace(/<tr[^>]*>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(td|th)>/gi, " | ")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function toImagePlaceholder(tag: string): string {
  const alt = /\balt\s*=\s*"([^"]*)"|\balt\s*=\s*'([^']*)'|\balt\s*=\s*([^\s"'>]+)/i.exec(tag);
  const description = (alt?.[1] ?? alt?.[2] ?? alt?.[3] ?? "").trim();
  return description.length > 0 ? `[그림: ${description}]` : "[그림]";
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      return decodeCodePoint(match, Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return decodeCodePoint(match, Number.parseInt(entity.slice(1), 10));
    }
    return ENTITY_MAP[entity] ?? match;
  });
}

function decodeCodePoint(fallback: string, value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) {
    return fallback;
  }

  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
}
