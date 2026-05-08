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
    name: "adds idea framing for proposition wiki links",
    input:
      "[[threat dreams rehearse danger without physical consequence]] gives the sharp case.",
    expected:
      "the idea that threat dreams rehearse danger without physical consequence gives the sharp case.",
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
  {
    name: "frames proposition wiki links after this is why",
    input:
      "This is why [[dream consciousness presents experience as an immersive world-for-me]] matters.",
    expected:
      "This is why the idea that dream consciousness presents experience as an immersive world-for-me matters.",
  },
  {
    name: "frames proposition wiki links as prepositional objects",
    input:
      "Dreaming sits near [[imagination and reality are equal and inseparable]]: imagination borrows the body's structure.",
    expected:
      "Dreaming sits near the idea that imagination and reality are equal and inseparable: imagination borrows the body's structure.",
  },
  {
    name: "keeps aliases direct even when target is proposition-like",
    input:
      "from [[Fiction is a flight simulator for social cognition|fiction as safe rehearsal]] to games",
    expected: "from fiction as safe rehearsal to games",
  },
  {
    name: "frames capitalized proposition note titles",
    input:
      "This connects to [[Embodied simulation proposes we understand others by neurally rehearsing their states]], but shifts inward.",
    expected:
      "This connects to the idea that embodied simulation proposes we understand others by neurally rehearsing their states, but shifts inward.",
  },
  {
    name: "does not frame proposition wiki links before colons",
    input:
      "In Gernot Bohme's aesthetics, [[atmospheres are felt spaces between subject and object]]: they are not merely objective properties.",
    expected:
      "In Gernot Bohme's aesthetics, atmospheres are felt spaces between subject and object: they are not merely objective properties.",
  },
  {
    name: "does not frame conditional proposition wiki links",
    input:
      "If [[emotions can be spatial atmospheres rather than private states]], then the feeling after rainfall is not merely inner.",
    expected:
      "If emotions can be spatial atmospheres rather than private states, then the feeling after rainfall is not merely inner.",
  },
  {
    name: "does not frame complete proposition wiki links before semicolons",
    input:
      "[[Beautiful weather is not identical with fine weather]]; clouded, rainy, oppressive, post-rain, or contradictory weather can be aesthetically richer.",
    expected:
      "Beautiful weather is not identical with fine weather; clouded, rainy, oppressive, post-rain, or contradictory weather can be aesthetically richer.",
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
