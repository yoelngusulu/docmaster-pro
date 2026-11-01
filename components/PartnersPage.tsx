import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Handshake, Loader2, Network, Rocket, ShieldCheck, Sparkles } from "lucide-react";

const partnershipTypes = [
  { title: "Technology Partner", description: "Integrations, technical collaboration and shared product innovation.", icon: Network },
  { title: "Business Partner", description: "Commercial opportunities, distribution and business development.", icon: Handshake },
  { title: "Strategic Partner", description: "Long-term collaboration to expand access and create shared value.", icon: Rocket },
  { title: "Affiliate Partner", description: "Introduce YAJU to relevant audiences and build referral opportunities.", icon: Sparkles },
];

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function PartnersPage() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ fullName: "", organization: "", email: "", partnershipType: "Business Partner", inquiry: "", website: "" });

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (status !== "submitting") { setStatus("idle"); setMessage(""); }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not submit your inquiry. Please try again.");
      setStatus("success");
      setMessage("Thank you. Your partnership inquiry has been received. Our team will review it.");
      setForm({ fullName: "", organization: "", email: "", partnershipType: "Business Partner", inquiry: "", website: "" });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <section className="relative isolate overflow-hidden bg-slate-950 px-5 py-20 text-white sm:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.34),_transparent_55%)]" />
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">YAJU Partnership Program</p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">Become a Partner</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Let’s build digital solutions together. Partner with YAJU Tools to expand access to practical digital tools, create new opportunities and deliver greater value to users.</p>
              <a href="#partnership-inquiry" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500">Start a conversation <ArrowRight size={18} /></a>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <div className="flex items-center gap-3 text-blue-300"><ShieldCheck size={22} /><span className="text-sm font-semibold uppercase tracking-wider">Built around shared value</span></div>
              <p className="mt-4 text-xl font-semibold leading-8">Practical tools. Meaningful collaboration. Sustainable growth.</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">We welcome conversations with organizations, technology providers and individuals who share our interest in useful digital solutions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ways to collaborate</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Find the right partnership</h2>
          <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">Tell us what you have in mind. We are open to exploring collaborations that align with YAJU’s products and users.</p>
        </div>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {partnershipTypes.map((item) => { const Icon = item.icon; return <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><Icon size={22} /></div><h3 className="mt-5 font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p></article>; })}
        </div>
      </section>

      <section id="partnership-inquiry" className="border-y border-slate-200 bg-white px-5 py-16 dark:border-slate-800 dark:bg-slate-900 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Partnership inquiry</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Let’s start with a conversation.</h2>
            <p className="mt-5 leading-7 text-slate-600 dark:text-slate-300">Share a few details about yourself and the opportunity you would like to explore. Our team will review your inquiry and follow up.</p>
            <div className="mt-7 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={18} /> Clear, relevant partnership proposals</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={18} /> Reviewed by the YAJU team</p>
              <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={18} /> No commitment required to make an inquiry</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:p-8">
            <div className="hidden" aria-hidden="true"><label htmlFor="partner-website">Website</label><input id="partner-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="partner-name" className="mb-2 block text-sm font-semibold">Full name <span className="text-red-500">*</span></label><input id="partner-name" required minLength={2} maxLength={120} autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950" placeholder="Your full name" /></div>
              <div><label htmlFor="partner-organization" className="mb-2 block text-sm font-semibold">Organization / Company</label><input id="partner-organization" maxLength={160} autoComplete="organization" value={form.organization} onChange={(event) => update("organization", event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950" placeholder="Organization name (optional)" /></div>
              <div className="sm:col-span-2"><label htmlFor="partner-email" className="mb-2 block text-sm font-semibold">Email address <span className="text-red-500">*</span></label><input id="partner-email" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950" placeholder="you@company.com" /></div>
              <div className="sm:col-span-2"><label htmlFor="partner-type" className="mb-2 block text-sm font-semibold">Partnership type <span className="text-red-500">*</span></label><select id="partner-type" required value={form.partnershipType} onChange={(event) => update("partnershipType", event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950">{partnershipTypes.map((item) => <option key={item.title} value={item.title}>{item.title}</option>)}</select></div>
              <div className="sm:col-span-2"><label htmlFor="partner-message" className="mb-2 block text-sm font-semibold">Tell us about your proposal <span className="text-red-500">*</span></label><textarea id="partner-message" required minLength={10} maxLength={3000} rows={5} value={form.inquiry} onChange={(event) => update("inquiry", event.target.value)} className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950" placeholder="Briefly describe your organization, idea or proposed collaboration..." /><p className="mt-1 text-right text-xs text-slate-500">{form.inquiry.length}/3000</p></div>
            </div>
            {message && <p role={status === "error" ? "alert" : "status"} className={`mt-5 rounded-xl px-4 py-3 text-sm ${status === "success" ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{message}</p>}
            <button type="submit" disabled={status === "submitting" || status === "success"} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{status === "submitting" ? <><Loader2 size={18} className="animate-spin" /> Sending inquiry...</> : status === "success" ? "Inquiry received" : <>Submit partnership inquiry <ArrowRight size={18} /></>}</button>
            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Your information will be used only to review and respond to this partnership inquiry. See our <Link href="/privacy" className="font-medium text-blue-600 underline dark:text-blue-400">Privacy Policy</Link>.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
