const WIKI_LINK_PATTERN = /!?\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

export function prepareTextForSpeech(rawText: string): string {
  return normalizeWhitespace(
    normalizeSymbols(
      convertLineStructure(
        convertInlineCode(
          convertMarkdownLinks(convertWikiLinks(convertCodeBlocks(rawText))),
        ),
      ),
    ),
  );
}

function convertCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "\nCode block omitted.\n");
}

function convertWikiLinks(text: string): string {
  return text.replace(WIKI_LINK_PATTERN, (match: string, body: string) => {
    const isEmbed = match.startsWith("!");
    const [target, alias] = body.split("|");
    const spokenText = cleanLinkText(alias || target || "");

    if (!spokenText) {
      return isEmbed ? "Embedded item." : "Linked note.";
    }

    if (isEmbed) {
      return `Embedded item: ${spokenText}.`;
    }

    return `${spokenText}, this links to another note,`;
  });
}

function convertMarkdownLinks(text: string): string {
  return text.replace(MARKDOWN_LINK_PATTERN, (_match, label: string) =>
    cleanLinkText(label),
  );
}

function convertInlineCode(text: string): string {
  return text.replace(INLINE_CODE_PATTERN, (_match, code: string) => {
    const command = normalizeWhitespace(code);
    return command ? `command ${command}` : "";
  });
}

function convertLineStructure(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => convertLine(line))
    .join("\n");
}

function convertLine(line: string): string {
  const trimmed = line.trim();

  if (!trimmed) {
    return "";
  }

  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    return withSentenceEnd(`Heading: ${headingMatch[2]}`);
  }

  const blockquoteMatch = trimmed.match(/^>\s?(.+)$/);
  if (blockquoteMatch) {
    return withSentenceEnd(`Quote: ${blockquoteMatch[1]}`);
  }

  const uncheckedTaskMatch = trimmed.match(/^[-*+]\s+\[\s\]\s+(.+)$/);
  if (uncheckedTaskMatch) {
    return withSentenceEnd(`Unchecked task: ${uncheckedTaskMatch[1]}`);
  }

  const completedTaskMatch = trimmed.match(/^[-*+]\s+\[[xX]\]\s+(.+)$/);
  if (completedTaskMatch) {
    return withSentenceEnd(`Completed task: ${completedTaskMatch[1]}`);
  }

  const unorderedListMatch = trimmed.match(/^[-*+]\s+(.+)$/);
  if (unorderedListMatch) {
    return withSentenceEnd(`List item: ${unorderedListMatch[1]}`);
  }

  const orderedListMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
  if (orderedListMatch) {
    return withSentenceEnd(`List item: ${orderedListMatch[1]}`);
  }

  return line;
}

function normalizeSymbols(text: string): string {
  return text
    .replace(/(\w)\/(\w)/g, "$1 or $2")
    .replace(/&/g, " and ")
    .replace(/%/g, " percent ")
    .replace(/\+/g, " plus ")
    .replace(/=/g, " equals ")
    .replace(/@/g, " at ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[{}<>\[\]|^*_~\\]/g, " ");
}

function cleanLinkText(text: string): string {
  return normalizeWhitespace(text.replace(/^#+/, "").replace(/\.(\w+)$/g, " dot $1"));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function withSentenceEnd(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
