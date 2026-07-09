import { FeedbackSurveyEmbed } from "./FeedbackSurveyEmbed";

interface FeedbackSurveySectionProps {
  title?: string;
  subtitle?: string;
  /** Use on full-page /feedback route */
  tall?: boolean;
}

export function FeedbackSurveySection({
  title = "We’d love your feedback",
  subtitle = "You’re helping shape Book Buddy for kids, parents, and teachers. Tell us what’s working and what we should build next.",
  tall,
}: FeedbackSurveySectionProps) {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="text-center sm:text-left">
        <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kids-purple">
          Beta survey
        </span>
        <h1 className="mt-3 font-kids-display text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-slate-600">{subtitle}</p>
      </div>

      <div className="mt-8">
        <FeedbackSurveyEmbed tall={tall} />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 sm:text-left">
        Form hosted securely by Google Forms. Your responses are sent directly to the Book Buddy team.
      </p>
    </section>
  );
}
