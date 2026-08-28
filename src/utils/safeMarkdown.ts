export type SafeReportBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "unordered"; items: string[] }
  | { kind: "ordered"; items: string[] };

export const parseSafeReportBlocks = (source: string): SafeReportBlock[] => {
  const blocks: SafeReportBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const kind = unordered ? "unordered" : "ordered";
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        const match = kind === "unordered"
          ? /^[-*]\s+(.+)$/.exec(candidate)
          : /^\d+[.)]\s+(.+)$/.exec(candidate);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push(kind === "unordered" ? { kind, items } : { kind, items });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
};

