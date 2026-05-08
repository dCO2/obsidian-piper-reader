import assert from "node:assert/strict";

import { prepareTextForSpeech } from "./prepareTextForSpeech";

const cases: Array<{ name: string; input: string; expected: string }> = [
  {
    name: "keeps plain prose and long dash readable",
    input: "The frame works — but has limits.",
    expected: "The frame works — but has limits.",
  },
  {
    name: "reads wiki links as their note text",
    input: "[[Bordwell]] gives the classic account.",
    expected: "Bordwell gives the classic account.",
  },
  {
    name: "reads wiki link aliases",
    input: "[[Bordwell's art cinema mode|classic account]] matters.",
    expected: "classic account matters.",
  },
  {
    name: "converts embeds into spoken embed cues",
    input: "![[diagram.png]]",
    expected: "Embedded item: diagram dot png.",
  },
  {
    name: "keeps markdown link labels and drops urls",
    input: "[Stanford Encyclopedia](https://example.com) has an entry.",
    expected: "Stanford Encyclopedia has an entry.",
  },
  {
    name: "converts only line-start heading markers",
    input: "## Historical Background",
    expected: "Heading: Historical Background.",
  },
  {
    name: "does not convert inline hashes as tags",
    input: "This mentions #film-theory inline.",
    expected: "This mentions #film-theory inline.",
  },
  {
    name: "converts blockquotes",
    input: "> This is quoted.",
    expected: "Quote: This is quoted.",
  },
  {
    name: "converts tasks",
    input: "- [ ] Read Bordwell\n- [x] Watch film",
    expected: "Unchecked task: Read Bordwell. Completed task: Watch film.",
  },
  {
    name: "converts slash between words to or",
    input: "expressive/art movies",
    expected: "expressive or art movies",
  },
  {
    name: "converts inline code into command phrasing",
    input: "Run `npm run build` before testing.",
    expected: "Run command npm run build before testing.",
  },
  {
    name: "omits fenced code blocks",
    input: "Before\n```ts\nconst x = 1;\n```\nAfter",
    expected: "Before Code block omitted. After",
  },
];

for (const testCase of cases) {
  assert.equal(
    prepareTextForSpeech(testCase.input),
    testCase.expected,
    testCase.name,
  );
}

console.log(`Passed ${cases.length} spoken text preparation tests.`);
