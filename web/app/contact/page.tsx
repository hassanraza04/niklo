import { ContactForm } from "@/components/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Send feedback, suggestions, or questions about Niklo.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-display text-lg italic text-clay">Contact</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Help make Niklo more useful.
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        Found something that needs fixing, have an idea, or just want to share feedback? You can email me
        directly at{" "}
        <a href="mailto:hr2616@nyu.edu" className="font-medium text-clay hover:text-clay-dark">
          hr2616@nyu.edu
        </a>
        .
      </p>
      <ContactForm />
    </div>
  );
}
