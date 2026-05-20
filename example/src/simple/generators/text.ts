export function txtBody(): string {
  return [
    "OPFS Studio · sample text file",
    "================================",
    "",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "",
    `Generated at: ${new Date().toISOString()}`,
  ].join("\n");
}

export function jsonBody(): string {
  const payload = {
    generatedAt: new Date().toISOString(),
    items: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `item-${i + 1}`,
      value: Math.round(Math.random() * 1000) / 10,
    })),
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

export function csvBody(): string {
  const rows = [
    ["id", "name", "score"],
    ["1", "alpha", "12.4"],
    ["2", "bravo", "7.9"],
    ["3", "charlie", "15.1"],
    ["4", "delta", "9.0"],
    ["5", "echo", "13.7"],
  ];
  return rows.map((r) => r.join(",")).join("\n") + "\n";
}

export function mdBody(): string {
  const ts = new Date().toISOString();
  return `# OPFS Studio · sample readme

A full markdown showcase to verify how the preview renders every common
construct. Generated at ${ts}.

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

---

## Inline formatting

This paragraph mixes **bold**, *italic*, ***bold italic***, ~~strikethrough~~,
\`inline code\`, and a [link to MDN](https://developer.mozilla.org/). You can also
hide text inside an HTML <span title="hover me">tooltip span</span> — the
sanitiser keeps safe tags.

A line with a hard&nbsp;break
and a soft break on the next line.

## Block quotes

> A single-line block quote.

> Multi-paragraph quote.
>
> Second paragraph inside the same quote.
>
> > Nested quote level two.

## Lists

Unordered list:

- First item
- Second item with **emphasis**
  - Nested item
    - Deeper nested item
- Third item

Ordered list:

1. Step one
2. Step two
   1. Sub-step a
   2. Sub-step b
3. Step three

Task list:

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

## Code

Inline: \`const x: number = 42;\`

Fenced block with language:

\`\`\`ts
interface Item {
  id: number;
  name: string;
}

export function greet(item: Item): string {
  return \`Hello, \${item.name} (#\${item.id})\`;
}
\`\`\`

Plain fenced block:

\`\`\`
$ npm run build:chrome
$ npm run dev
\`\`\`

## Tables

| Component       | Status | Notes                          |
| --------------- | :----: | ------------------------------ |
| Side panel      |   ✅   | works in Chrome / Edge         |
| DevTools panel  |   ✅   | F12 → OPFS Studio              |
| Action popup    |   ✅   | small window above the toolbar |
| Conflict UI     |   ⚠️   | requires open file + diff      |

## Links and images

Reference-style link: [docs][docs-ref].

[docs-ref]: https://example.com/docs

Inline image (1×1 transparent PNG, base64):

![placeholder pixel](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)

## Horizontal rule

***

## Footnotes

Markdown supports footnotes[^1] which the renderer may or may not honour.

[^1]: This is a footnote definition.

## HTML passthrough

<details>
  <summary>Click to expand</summary>

  Hidden content revealed on click. The DOMPurify pass keeps \`<details>\` and
  \`<summary>\` because they're safe interactive HTML.

</details>

---

End of file.
`;
}
