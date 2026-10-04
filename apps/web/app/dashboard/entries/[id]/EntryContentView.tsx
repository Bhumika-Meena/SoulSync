"use client";

/**
 * Read-only view of diary entry content.
 * Renders rich HTML (fonts, bold, italic, underline, color) and optional background image
 * exactly as written, without editing.
 */
/** Strip script/style/event handlers so rich text is safe to render. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s*on\w+=["'][^"']*["']/gi, "")
    .replace(/\s*on\w+=\s*[^\s>]*/gi, "");
}

type EntryContentViewProps = {
  htmlContent: string | null;
  plainContent: string;
  backgroundImage: string | null;
};

export function EntryContentView({
  htmlContent,
  plainContent,
  backgroundImage,
}: EntryContentViewProps) {
  const hasRich = htmlContent && htmlContent.trim().length > 0;
  const content = hasRich ? sanitizeHtml(htmlContent) : plainContent;
  const isHtml = hasRich;

  return (
    <div
      className="entry-view-content p-6 pt-4 min-h-[200px] rounded-b-2xl text-soul-primary-text/90"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {isHtml ? (
        <div
          className="prose prose-sm max-w-none [&_*]:cursor-default entry-view-html select-text"
          style={{ wordBreak: "break-word" }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <p className="whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}
