"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft, Download, QrCode } from "lucide-react";

type ContentType = "website" | "text" | "email" | "phone";
type Output = { key: string; png: string; svg: string; error?: string };

function encodeContent(type: ContentType, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter content to create a QR code.");
  if (type === "website") {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url: URL;
    try { url = new URL(normalized); } catch { throw new Error("Enter a valid website address."); }
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) throw new Error("Enter a valid website address.");
    return url.toString();
  }
  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error("Enter a valid email address.");
    return `mailto:${trimmed}`;
  }
  if (type === "phone") {
    if (!/^\+?[\d().\s-]{5,}$/.test(trimmed) || trimmed.replace(/\D/g, "").length < 5) throw new Error("Enter a valid telephone number.");
    return `tel:${trimmed.replace(/[().\s-]/g, "")}`;
  }
  return trimmed;
}

export default function QRCodeGenerator() {
  const [type, setType] = useState<ContentType>("website");
  const [value, setValue] = useState("");
  const [size, setSize] = useState(512);
  const [foreground, setForeground] = useState("#111827");
  const [background, setBackground] = useState("#ffffff");
  const [result, setResult] = useState<Output | null>(null);
  const payload = useMemo(() => {
    try { return { data: encodeContent(type, value), error: "" }; }
    catch (reason) { return { data: "", error: value.trim() ? (reason as Error).message : "" }; }
  }, [type, value]);
  const requestKey = JSON.stringify([payload.data, size, foreground, background]);
  const output = result?.key === requestKey && !result.error ? result : null;
  const loading = Boolean(payload.data) && result?.key !== requestKey;
  const error = payload.error || (result?.key === requestKey ? result.error || "" : "");

  useEffect(() => {
    let active = true;
    if (!payload.data) return;
    const options = { width: size, margin: 4, errorCorrectionLevel: "M" as const, color: { dark: foreground, light: background } };
    Promise.all([QRCode.toDataURL(payload.data, options), QRCode.toString(payload.data, { ...options, type: "svg" })])
      .then(([png, svg]) => { if (active) setResult({ key: requestKey, png, svg }); })
      .catch(() => { if (active) setResult({ key: requestKey, png: "", svg: "", error: "This content is too long to fit in a QR code. Try a shorter value." }); });
    return () => { active = false; };
  }, [payload.data, requestKey, size, foreground, background]);

  const download = (format: "png" | "svg") => {
    if (!output) return;
    const blob = format === "png"
      ? null
      : new Blob([output.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = format === "png" ? output.png : URL.createObjectURL(blob!);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yaju-qr-code-${size}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (format === "svg") URL.revokeObjectURL(url);
  };

  const label = { website: "Website URL", text: "Plain text", email: "Email address", phone: "Telephone number" }[type];
  const placeholder = { website: "https://example.com", text: "Type your message", email: "name@example.com", phone: "+255 712 345 678" }[type];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/tools/pdf" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"><ArrowLeft size={16} />Back to YAJU Documents</Link>
        <header className="mb-8">
          <div className="flex items-center gap-3 text-blue-600"><QrCode size={28} /><p className="text-sm font-bold uppercase tracking-wide">YAJU Documents</p></div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">QR Code Generator</h1>
          <p className="mt-3 max-w-2xl text-gray-600">Create and download a scannable QR code for a website, text, email address or phone number.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="QR code settings">
            <div>
              <label htmlFor="qr-type" className="mb-2 block text-sm font-semibold text-gray-800">Content type</label>
              <select id="qr-type" value={type} onChange={(event) => setType(event.target.value as ContentType)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="website">Website URL</option><option value="text">Plain text</option><option value="email">Email address</option><option value="phone">Telephone number</option>
              </select>
            </div>
            <div>
              <label htmlFor="qr-content" className="mb-2 block text-sm font-semibold text-gray-800">{label}</label>
              <textarea id="qr-content" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} rows={4} maxLength={2500} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <p className="mt-1 text-right text-xs text-gray-500">{value.length}/2500</p>
            </div>
            <div>
              <label htmlFor="qr-size" className="mb-2 block text-sm font-semibold text-gray-800">Output size</label>
              <select id="qr-size" value={size} onChange={(event) => setSize(Number(event.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {[256, 512, 1024].map((option) => <option key={option} value={option}>{option} × {option} px</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800">Foreground color <input aria-label="Foreground color" type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" /></label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800">Background color <input aria-label="Background color" type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" /></label>
            </div>
            <p className="text-xs leading-5 text-gray-500">A four-module quiet zone is included around each code. Keep strong contrast for reliable scanning.</p>
          </section>
          <section className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7" aria-label="QR code preview">
            <h2 className="self-start text-lg font-bold text-gray-950">Preview</h2>
            <div className="my-6 flex aspect-square w-full max-w-[340px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
              {output ? (
                // The generated data URL is already a finished image and does not need Next's image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={output.png} alt="Generated QR code preview" className="h-full w-full object-contain" />
              ) : <div className="text-center text-gray-500"><QrCode className="mx-auto mb-3 text-gray-400" size={48} /><p className="text-sm">{loading ? "Generating QR code…" : "Your QR code will appear here"}</p></div>}
            </div>
            <div className="min-h-6 text-center text-sm" aria-live="polite">{error && <p className="text-red-700">{error}</p>}{loading && output && <p className="text-gray-500">Updating preview…</p>}</div>
            <div className="mt-auto grid w-full gap-3 sm:grid-cols-2">
              <button type="button" disabled={!output || loading} onClick={() => download("png")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"><Download size={17} />Download PNG</button>
              <button type="button" disabled={!output || loading} onClick={() => download("svg")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"><Download size={17} />Download SVG</button>
            </div>
            <p className="mt-3 text-xs text-gray-500">Files are generated in your browser. Content is not uploaded.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
