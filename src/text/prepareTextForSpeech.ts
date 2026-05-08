const WIKI_LINK_PATTERN = /!?\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const PROPOSITION_VERB_PATTERN =
  /\b(?:am|is|are|was|were|be|being|been|can|cannot|could|should|would|will|do|does|did|has|have|had|proposes?|presents?|organizes?|rehearses?|simulates?|shows?|links?|depends?|becomes?|suggests?|explains?|argues?|claims?|frames?|defines?|describes?)\b/i;
const CLAUSE_OPENER_PATTERN =
  /\b(?:if|when|because|although|though|since|while|whether|that|where|how)\s*$/i;
const LINK_CLAUSE_BOUNDARY_PATTERN = /^\s*(?:[,;.!?]|$)/;

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
  return text.replace(
    WIKI_LINK_PATTERN,
    (match: string, body: string, offset: number, fullText: string) => {
      const isEmbed = match.startsWith("!");
      const [target, alias] = body.split("|");
      const spokenText = cleanLinkText(alias || target || "");

      if (!spokenText) {
        return isEmbed ? "Embedded item." : "Linked note.";
      }

      if (isEmbed) {
        return `Embedded item: ${spokenText}.`;
      }

      if (alias) {
        return spokenText;
      }

      return shouldFrameWikiLinkAsIdea(
        spokenText,
        fullText,
        offset,
        offset + match.length,
      )
        ? `the idea that ${lowercaseFirstLetter(spokenText)}`
        : spokenText;
    },
  );
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
  return normalizeWhitespace(
    text.replace(/^#+/, "").replace(/\.(\w+)$/g, " dot $1"),
  );
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function withSentenceEnd(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function isPropositionLike(text: string): boolean {
  return PROPOSITION_VERB_PATTERN.test(text);
}

function lowercaseFirstLetter(text: string): string {
  return text.replace(/^([A-Z])/, (firstLetter) => firstLetter.toLowerCase());
}

function isDirectColonClaim(text: string, startIndex: number, endIndex: number): boolean {
  return (
    text.slice(endIndex).trimStart().startsWith(":") &&
    !isPrepositionalObjectContext(text, startIndex)
  );
}

function shouldFrameWikiLinkAsIdea(
  spokenText: string,
  fullText: string,
  startIndex: number,
  endIndex: number,
): boolean {
  if (!isPropositionLike(spokenText)) {
    return false;
  }

  if (isPrepositionalObjectContext(fullText, startIndex)) {
    return true;
  }

  if (isDirectColonClaim(fullText, startIndex, endIndex)) {
    return false;
  }

  if (
    isClauseOpenerContext(fullText, startIndex) &&
    isFollowedByClauseBoundary(fullText, endIndex)
  ) {
    return false;
  }

  return true;
}

function isPrepositionalObjectContext(text: string, index: number): boolean {
  const beforeLink = text.slice(0, index).trimEnd();
  return /\b(?:about|after|around|as|at|before|by|for|from|in|into|near|of|on|onto|through|to|toward|towards|with)\s*$/i.test(
    beforeLink,
  );
}

function isClauseOpenerContext(text: string, index: number): boolean {
  return CLAUSE_OPENER_PATTERN.test(text.slice(0, index).trimEnd());
}

function isFollowedByClauseBoundary(text: string, index: number): boolean {
  return LINK_CLAUSE_BOUNDARY_PATTERN.test(text.slice(index));
}
