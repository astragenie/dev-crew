import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";

export function extractSection(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  const slice = end === -1 ? lines.slice(start + 1) : lines.slice(start + 1, end);
  return slice.join("\n").trim();
}

function replaceSection(body, heading, newContent) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return body;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  const before = lines.slice(0, start + 1);
  const after = end === -1 ? [] : lines.slice(end);
  return [...before, "", newContent, ""].concat(after).join("\n");
}

function normalize(s) {
  return (s || "").replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

export function diffBody(localContent, githubBody) {
  const { body: localBody } = parseFrontmatter(localContent);
  const localDesc = extractSection(localBody, "## Description");
  const localAc = extractSection(localBody, "## Acceptance criteria");
  const ghDesc = extractSection(githubBody, "## Description");
  const ghAc = extractSection(githubBody, "## Acceptance criteria");
  const changes = [];
  if (ghDesc !== null && normalize(ghDesc) !== normalize(localDesc || ""))
    changes.push("description");
  if (ghAc !== null && normalize(ghAc) !== normalize(localAc || ""))
    changes.push("acceptance-criteria");
  return {
    changed: changes.length > 0,
    sections: { description: ghDesc, ac: ghAc },
    changes
  };
}

export function patchBody(localContent, githubBody, today) {
  const { frontmatter, body } = parseFrontmatter(localContent);
  const ghDesc = extractSection(githubBody, "## Description");
  const ghAc = extractSection(githubBody, "## Acceptance criteria");
  let newBody = body;
  if (ghDesc !== null) newBody = replaceSection(newBody, "## Description", ghDesc);
  if (ghAc !== null) newBody = replaceSection(newBody, "## Acceptance criteria", ghAc);
  return serializeFrontmatter({ ...frontmatter, updated: today }, newBody);
}
