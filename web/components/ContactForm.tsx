"use client";

import { type FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          company: formData.get("company"),
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || "Your message could not be sent. Please try again shortly.");
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("sent");
    } catch {
      setError("Your message could not be sent. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <form
      className="mt-8 space-y-5 rounded-[var(--radius-card)] border border-line bg-card p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <input
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
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
          disabled={status === "sending"}
          className="rounded-full bg-clay px-5 py-2.5 font-semibold text-paper transition-transform hover:-translate-y-0.5"
        >
          {status === "sending" ? "Sending..." : "Send feedback"}
        </button>
        {status === "sent" && (
          <p className="text-sm text-ink-soft" role="status">
            Thanks. Your message has been sent.
          </p>
        )}
        {status === "error" && <p className="text-sm text-clay-dark" role="alert">{error}</p>}
      </div>
    </form>
  );
}
