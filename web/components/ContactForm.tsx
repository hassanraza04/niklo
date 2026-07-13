"use client";

import { type FormEvent, useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSubmitted(true);
  }

  return (
    <form
      className="mt-8 space-y-5 rounded-[var(--radius-card)] border border-line bg-card p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Name <span className="font-normal text-ink-soft">Optional</span>
          <input
            name="name"
            autoComplete="name"
            className="rounded-lg border border-line bg-paper px-3 py-2.5 font-normal text-ink outline-none focus:border-clay/50"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Email <span className="font-normal text-ink-soft">Optional</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="rounded-lg border border-line bg-paper px-3 py-2.5 font-normal text-ink outline-none focus:border-clay/50"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        Feedback, suggestions, or questions
        <textarea
          name="message"
          required
          rows={6}
          className="resize-y rounded-lg border border-line bg-paper px-3 py-2.5 font-normal text-ink outline-none focus:border-clay/50"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-clay px-5 py-2.5 font-semibold text-paper transition-transform hover:-translate-y-0.5"
        >
          Send feedback
        </button>
        {submitted && (
          <p className="text-sm text-ink-soft" role="status">
            The contact inbox is being connected. Your message has not been sent yet, so please use the
            email link above for now.
          </p>
        )}
      </div>
    </form>
  );
}
