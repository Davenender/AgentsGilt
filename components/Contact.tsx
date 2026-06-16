"use client";

import { useEffect, useState } from "react";
import { contact, services, site } from "@/lib/content";

type Status = "idle" | "sending" | "success" | "error";

const OTHER = "Sonstiges";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [service, setService] = useState<string>("");

  // Auf Klick einer Leistungs-Karte reagieren: passende Leistung vorauswählen.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setService(detail);
    };
    window.addEventListener("ag:select-service", onSelect as EventListener);
    return () =>
      window.removeEventListener("ag:select-service", onSelect as EventListener);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      company: String(fd.get("company") || ""),
      service: String(fd.get("service") || ""),
      message: String(fd.get("message") || ""),
      website: String(fd.get("website") || ""), // Honeypot
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Etwas ist schiefgelaufen. Bitte versuch es erneut.");
        setStatus("error");
        return;
      }
      setStatus("success");
      form.reset();
      setService("");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuch es später erneut.");
      setStatus("error");
    }
  }

  const isOther = service === OTHER;

  return (
    <section id="kontakt" className="bg-ink py-24 text-white md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {contact.kicker}
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            {contact.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/65">
            {contact.text}
          </p>
        </div>

        <div className="mt-12 rounded-3xl bg-white p-7 text-ink sm:p-10">
          {status === "success" ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
                <span className="text-2xl text-gold-dark">✓</span>
              </div>
              <h3 className="font-display text-xl font-bold text-ink">
                Danke! Deine Anfrage ist da.
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                Wir melden uns meist innerhalb eines Werktages bei dir.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot – für Menschen unsichtbar */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name *">
                  <input
                    name="name"
                    required
                    maxLength={120}
                    className={inputClass}
                    placeholder="Dein Name"
                  />
                </Field>
                <Field label="E-Mail *">
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={160}
                    className={inputClass}
                    placeholder="du@firma.de"
                  />
                </Field>
              </div>

              <Field label="Unternehmen">
                <input
                  name="company"
                  maxLength={160}
                  className={inputClass}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Gewünschte Leistung">
                <select
                  name="service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Allgemeine Anfrage</option>
                  {services.map((s) => (
                    <option key={s.title} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                  <option value={OTHER}>Sonstiges (selbst beschreiben)</option>
                </select>
              </Field>

              <Field label={isOther ? "Beschreibe deine Leistung *" : "Worum geht's? *"}>
                <textarea
                  name="message"
                  required
                  maxLength={3000}
                  rows={5}
                  className={`${inputClass} resize-none`}
                  placeholder={
                    isOther
                      ? "Beschreibe kurz, welche Leistung du dir vorstellst…"
                      : "Erzähl uns kurz von deinem Projekt oder Problem…"
                  }
                />
              </Field>

              {status === "error" && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Wird gesendet…" : "Anfrage absenden"}
              </button>

              <div className="pt-1">
                <p className="mb-3 text-center text-xs text-ink-soft">
                  Oder direkt:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-cream px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-gold hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    E-Mail
                  </a>
                  <a
                    href={`https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(site.whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-cream px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-[#25D366] hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4 w-4 text-[#25D366]"
                      aria-hidden
                    >
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24-1.5 0-2.97-.4-4.26-1.17l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.28-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.24-.01-.37.11-.49.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48Z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-gold focus:bg-white";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
