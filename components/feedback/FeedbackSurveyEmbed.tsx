import { FEEDBACK_FORM_EMBED_URL } from "@/lib/constants";

interface FeedbackSurveyEmbedProps {
  /** Taller iframe for full-page layout */
  tall?: boolean;
  className?: string;
}

export function FeedbackSurveyEmbed({ tall, className = "" }: FeedbackSurveyEmbedProps) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-inner ${className}`}
    >
      <iframe
        src={FEEDBACK_FORM_EMBED_URL}
        title="Book Buddy beta feedback survey"
        className={`block w-full border-0 ${
          tall
            ? "min-h-[520px] h-[calc(100vh-12rem)] max-h-[900px]"
            : "min-h-[420px] h-[min(70vh,800px)] sm:min-h-[480px]"
        }`}
        loading="lazy"
        allow="fullscreen"
      >
        Loading…
      </iframe>
    </div>
  );
}
