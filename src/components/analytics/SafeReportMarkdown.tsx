import { Fragment, type ReactNode } from "react";
import { parseSafeReportBlocks } from "../../utils/safeMarkdown";

const renderInline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>
  );

const SafeReportMarkdown = ({ text }: { text: string }) => (
  <div className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
    {parseSafeReportBlocks(text).map((block, index) => {
      if (block.kind === "heading") {
        const className = block.level === 1
          ? "font-display text-xl font-black text-slate-950 dark:text-slate-100"
          : "font-bold text-slate-950 dark:text-slate-100";
        return <h3 key={index} className={className}>{renderInline(block.text)}</h3>;
      }
      if (block.kind === "unordered") {
        return <ul key={index} className="list-disc space-y-1 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
      }
      if (block.kind === "ordered") {
        return <ol key={index} className="list-decimal space-y-1 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>;
      }
      if (block.kind === "paragraph") {
        return <p key={index}>{renderInline(block.text)}</p>;
      }
      return null;
    })}
  </div>
);

export default SafeReportMarkdown;
