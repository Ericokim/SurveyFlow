import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { looksLikeHtml, normalizeRichTextValue } from "../../lib/utils/richText";

export function RichTextContent({ value = "", className = "" }) {
  const content = String(value || "");

  if (!content.trim()) return null;

  if (looksLikeHtml(content)) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: normalizeRichTextValue(content) }}
      />
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default RichTextContent;
