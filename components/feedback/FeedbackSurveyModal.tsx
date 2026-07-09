"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { FeedbackSurveyEmbed } from "./FeedbackSurveyEmbed";

interface FeedbackSurveyModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackSurveyModal({ open, onClose }: FeedbackSurveyModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close feedback survey"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="feedback-modal-title"
              className="text-lg font-bold text-slate-900 sm:text-xl"
            >
              Share your feedback
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Help us improve Book Buddy during beta — takes about 2 minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <FeedbackSurveyEmbed />
        </div>
      </div>
    </div>
  );
}
