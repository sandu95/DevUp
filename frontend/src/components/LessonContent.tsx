import Markdown, { type Components } from "react-markdown"

// Keep the page title as the only h1. Raw HTML and the default URL filtering
// are handled by react-markdown; no raw-HTML plugin is enabled here.
const components: Components = {
  h1: ({ children }) => <h2 className="text-2xl font-semibold leading-9 text-slate-950">{children}</h2>,
  h2: ({ children }) => <h3 className="text-xl font-semibold leading-8 text-slate-950">{children}</h3>,
  h3: ({ children }) => <h4 className="text-lg font-semibold leading-8 text-slate-950">{children}</h4>,
  h4: ({ children }) => <h5 className="text-base font-semibold text-slate-950">{children}</h5>,
  h5: ({ children }) => <h6 className="text-base font-semibold text-slate-950">{children}</h6>,
  h6: ({ children }) => <h6 className="text-base font-semibold text-slate-950">{children}</h6>,
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-2 pl-6 marker:text-indigo-500">{children}</ul>,
  ol: ({ children, start }) => <ol start={start} className="list-decimal space-y-2 pl-6 marker:text-indigo-500">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="space-y-3 border-l-4 border-indigo-200 pl-5 text-slate-600">{children}</blockquote>
  ),
  code: ({ children, className = "" }) => (
    <code className={`rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-indigo-700 ${className}`}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre
      role="region"
      aria-label="Code example"
      tabIndex={0}
      className="max-w-full overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-7 text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-sm [&_code]:text-inherit"
    >
      {children}
    </pre>
  ),
  a: ({ children, href }) => href ? (
    <a
      href={href}
      target={/^https?:\/\//i.test(href) ? "_blank" : undefined}
      rel={/^https?:\/\//i.test(href) ? "noopener noreferrer" : undefined}
      className="break-words rounded-sm font-medium text-indigo-600 underline underline-offset-4 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {children}
    </a>
  ) : <span>{children}</span>,
  hr: () => <hr className="border-slate-200" />,
}

export function LessonContent({
  content, label = "Lesson content",
}: { content: string; label?: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className="min-w-0 space-y-5 break-words text-[15px] leading-8 text-slate-700 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl"
    >
      <Markdown components={components}>{content}</Markdown>
    </div>
  )
}
