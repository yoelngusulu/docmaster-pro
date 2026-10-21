"use client";

import Link from "next/link";
import {
  Bot,
  MessageCircle,
  SendHorizontal,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  text: string;
  links?: { label: string; href: string }[];
};

type BotReply = Omit<ChatMessage, "id">;

const quickActions = [
  "Coordinates Converter",
  "PDF to Word",
  "Merge PDF",
  "Compress PDF",
  "Measure distance and area",
  "Water storage calculator",
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Welcome to YAJU AI! I can help you find the right tool for documents, images, GIS and fieldwork. Tell me what you want to do, and I’ll give you a direct link to the most relevant tool.",
      links: [
        { label: "Coordinates Converter", href: "/tools/coordinates-converter" },
        { label: "PDF to Word", href: "/tools/pdf/pdf-to-word" },
        { label: "Merge PDF", href: "/tools/pdf/merge-pdf" },
        { label: "Explore Field Tools", href: "/tools/gis" },
      ],
    },
  ]);

  // Open chatbot from Hero button
  useEffect(() => {
    const handleOpenAssistant = () => {
      setIsOpen(true);
    };

    window.addEventListener(
      "open-docmaster-ai",
      handleOpenAssistant
    );

    return () => {
      window.removeEventListener(
        "open-docmaster-ai",
        handleOpenAssistant
      );
    };
  }, []);

  // Automatically scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const getBotReply = (userMessage: string): BotReply => {
    const text = userMessage.toLowerCase().trim();
    const has = (...terms: string[]) => terms.some((term) => text.includes(term));
    const links = {
      coordinates: { label: "Open Coordinates Converter", href: "/tools/coordinates-converter" },
      distance: { label: "Open Distance & Area Calculator", href: "/tools/gis/distance-area-calculator" },
      water: { label: "Open Water Storage Calculator", href: "/tools/gis/water-storage-calculator" },
      bearing: { label: "Open Bearing & Azimuth", href: "/tools/gis/bearing-azimuth-calculator" },
      pdfWord: { label: "Open PDF to Word", href: "/tools/pdf/pdf-to-word" },
      pdfExcel: { label: "Open PDF to Excel", href: "/tools/pdf/pdf-to-excel" },
      pdfPpt: { label: "Open PDF to PowerPoint", href: "/tools/pdf/pdf-to-powerpoint" },
      wordPdf: { label: "Open Word to PDF", href: "/tools/pdf/word-to-pdf" },
      compress: { label: "Open Compress PDF", href: "/tools/pdf/compress-pdf" },
      merge: { label: "Open Merge PDF", href: "/tools/pdf/merge-pdf" },
      split: { label: "Open Split PDF", href: "/tools/pdf/split-pdf" },
      protect: { label: "Open Protect PDF", href: "/tools/pdf/protect-pdf" },
      unlock: { label: "Open Unlock PDF", href: "/tools/pdf/unlock-pdf" },
      imagePdf: { label: "Open Image to PDF", href: "/tools/image/image-to-pdf" },
      bg: { label: "Open Background Remover", href: "/tools/ai/background-remover" },
      imageEditor: { label: "Open AI Image Editor", href: "/tools/ai/image-editor" },
      jpgPng: { label: "Open JPG to PNG", href: "/tools/image/jpg-to-png" },
      pngJpg: { label: "Open PNG to JPG", href: "/tools/image/png-to-jpg" },
      webpJpg: { label: "Open WEBP to JPG", href: "/tools/image/webp-to-jpg" },
      webpPng: { label: "Open WEBP to PNG", href: "/tools/image/webp-to-png" },
      fieldHub: { label: "Explore YAJU Field Tools", href: "/tools/gis" },
      pdfHub: { label: "Explore Document Tools", href: "/tools/pdf" },
      imageHub: { label: "Explore Image Tools", href: "/tools/image" },
    };

    if (has("hello", "hi", "hey", "habari", "mambo", "hujambo", "niaje")) return { sender: "bot", text: "Hi! 👋 Welcome to YAJU. Tell me what you want to do and I’ll take you straight to the right tool. You can start with our fieldwork tools, document tools, or image tools.", links: [links.coordinates, links.pdfHub, links.imageHub] };
    if (has("coordinate", "coordinates", "lat long", "latitude", "longitude", "utm", "convert gps", "gps location", "badili koordinat")) return { sender: "bot", text: "Need to convert coordinates? YAJU’s Coordinates Converter helps with coordinate conversion for GIS and fieldwork. Open it directly below.", links: [links.coordinates, links.fieldHub] };
    if (has("distance", "measure area", "area calculator", "calculate area", "calculate distance", "pima eneo", "pima umbali", "eneo na umbali")) return { sender: "bot", text: "For field measurements, use YAJU’s Distance & Area Calculator. It’s part of our practical GIS and surveying tools.", links: [links.distance, links.fieldHub] };
    if (has("water storage", "tank sizing", "tank size", "water tank", "storage tank", "ujazo wa tank", "tanki la maji", "water volume")) return { sender: "bot", text: "Planning water storage? Open the YAJU Water Storage & Tank Sizing Calculator to work out storage requirements.", links: [links.water, links.fieldHub] };
    if (has("bearing", "azimuth", "direction angle", "mwelekeo")) return { sender: "bot", text: "Use YAJU Bearing & Azimuth for bearing and direction calculations used in surveying and fieldwork.", links: [links.bearing, links.fieldHub] };
    if (has("pdf to word", "convert pdf to word", "pdf into word", "pdf to docx", "pdf kuwa word", "badili pdf kuwa word")) return { sender: "bot", text: "YAJU has a PDF to Word page for this task. Open it to check the available conversion workflow. If server-side conversion is not enabled yet, the tool may not complete the conversion.", links: [links.pdfWord, links.pdfHub] };
    if (has("pdf to excel", "convert pdf to excel", "pdf to spreadsheet", "pdf to xlsx")) return { sender: "bot", text: "Need tables in a spreadsheet? Open YAJU PDF to Excel. Server-side conversion availability depends on the current deployment.", links: [links.pdfExcel, links.pdfHub] };
    if (has("pdf to powerpoint", "pdf to ppt", "convert pdf to slides")) return { sender: "bot", text: "Open YAJU PDF to PowerPoint to check the current PDF-to-presentation workflow.", links: [links.pdfPpt, links.pdfHub] };
    if (has("word to pdf", "docx to pdf", "convert word", "word kuwa pdf")) return { sender: "bot", text: "Open YAJU Word to PDF to access the document conversion workflow.", links: [links.wordPdf, links.pdfHub] };
    if (has("compress", "reduce pdf size", "smaller pdf", "punguza ukubwa wa pdf", "pdf kubwa")) return { sender: "bot", text: "Need a smaller PDF? YAJU’s Compress PDF tool is the direct place to start.", links: [links.compress, links.pdfHub] };
    if (has("merge pdf", "combine pdf", "join pdf", "unganisha pdf")) return { sender: "bot", text: "Combine PDF files with YAJU Merge PDF. Open the tool to select your files.", links: [links.merge, links.pdfHub] };
    if (has("split pdf", "separate pdf", "divide pdf", "gawanya pdf")) return { sender: "bot", text: "Use YAJU Split PDF to separate a PDF into smaller files or sections.", links: [links.split, links.pdfHub] };
    if (has("protect pdf", "password pdf", "lock pdf", "secure pdf")) return { sender: "bot", text: "Open YAJU Protect PDF to access the PDF password-protection tool.", links: [links.protect, links.pdfHub] };
    if (has("unlock pdf", "remove pdf password", "unprotect pdf")) return { sender: "bot", text: "Open YAJU Unlock PDF to check the available PDF unlocking workflow.", links: [links.unlock, links.pdfHub] };
    if (has("image to pdf", "photo to pdf", "picture to pdf", "picha kuwa pdf")) return { sender: "bot", text: "Turn an image into a PDF with YAJU Image to PDF.", links: [links.imagePdf, links.imageHub] };
    if (has("remove background", "background remover", "transparent background", "futa background", "ondoa background")) return { sender: "bot", text: "Want to remove an image background? Open YAJU Background Remover. AI processing availability depends on whether its service is configured.", links: [links.bg, links.imageHub] };
    if (has("image editor", "edit image", "retouch", "enhance image", "boresha picha")) return { sender: "bot", text: "Open YAJU AI Image Editor to check image editing options.", links: [links.imageEditor, links.imageHub] };
    if (has("jpg to png", "jpeg to png")) return { sender: "bot", text: "Convert JPG/JPEG images to PNG using this YAJU tool.", links: [links.jpgPng, links.imageHub] };
    if (has("png to jpg", "png to jpeg")) return { sender: "bot", text: "Convert PNG images to JPG using this YAJU tool.", links: [links.pngJpg, links.imageHub] };
    if (has("webp to jpg")) return { sender: "bot", text: "Convert WEBP images to JPG using this YAJU tool.", links: [links.webpJpg, links.imageHub] };
    if (has("webp to png")) return { sender: "bot", text: "Convert WEBP images to PNG using this YAJU tool.", links: [links.webpPng, links.imageHub] };
    if (has("gis", "survey", "surveying", "fieldwork", "field work", "hydrology", "ramani", "upimaji", "maji", "mapping", "map")) return { sender: "bot", text: "For GIS, surveying, mapping and fieldwork, explore YAJU Field Tools. You can access coordinate conversion, distance and area measurement, bearing/azimuth, and water-storage sizing.", links: [links.coordinates, links.distance, links.water, links.fieldHub] };
    if (has("document", "pdf", "word", "excel", "powerpoint", "office", "file", "nyaraka")) return { sender: "bot", text: "YAJU helps with common document workflows. Choose the tool you need below, or browse all document tools.", links: [links.pdfWord, links.merge, links.compress, links.pdfHub] };
    if (has("image", "photo", "picture", "picha", "png", "jpg", "webp")) return { sender: "bot", text: "Looking for an image tool? YAJU offers image-to-PDF and image utilities. Browse the image tools below.", links: [links.imagePdf, links.imageHub] };
    return { sender: "bot", text: "I can help you find the right YAJU tool. Try asking for converting coordinates, measuring distance or area, sizing a water tank, converting PDF to Word, merging PDF files, compressing a PDF, or converting an image to PDF. Choose a popular tool below to get started.", links: [links.coordinates, links.pdfWord, links.merge, links.water, links.fieldHub, links.pdfHub] };
  };

  const sendMessage = (
    rawMessage: string
  ) => {
    const cleanedMessage =
      rawMessage.trim();

    if (!cleanedMessage || isTyping) return;

    const userChatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: cleanedMessage,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userChatMessage,
    ]);

    setMessage("");
    setIsTyping(true);

    window.setTimeout(() => {
      const botReply =
        getBotReply(cleanedMessage);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          ...botReply,
          id: crypto.randomUUID(),
        },
      ]);

      setIsTyping(false);
    }, 1200);
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    sendMessage(message);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="mb-4 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          {/* Chat header */}
          <div className="flex items-center justify-between bg-blue-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-2">
                <Bot size={22} />
              </div>

              <div>
                <h3 className="font-bold">
                  YAJU AI
                </h3>

                <p className="text-xs text-blue-100">
                  Tool Finder • Ready to help
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="rounded-lg p-2 transition hover:bg-white/20"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map(
              (chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`flex ${
                    chatMessage.sender ===
                    "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      chatMessage.sender ===
                      "user"
                        ? "rounded-br-none bg-blue-600 text-white"
                        : "rounded-tl-none bg-gray-100 text-gray-700"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-6">
                      {chatMessage.text}
                    </p>

                    {chatMessage.links && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {chatMessage.links.map((link) => (
                          <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">
                            {link.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-none bg-gray-100 px-4 py-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>
                      YAJU AI is typing
                    </span>

                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />

                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />

                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Try a tool */}
          <div className="border-t border-gray-200 px-4 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-500">
              Quick actions
            </p>

            <div className="flex gap-2 overflow-x-auto pb-3">
              {quickActions.map(
                (action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() =>
                      sendMessage(action)
                    }
                    disabled={isTyping}
                    className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {action}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Message form */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 p-4"
          >
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                disabled={isTyping}
                placeholder="What do you want to do?"
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
              />

              <button
                type="submit"
                disabled={
                  !message.trim() ||
                  isTyping
                }
                className="rounded-xl bg-blue-600 px-4 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <SendHorizontal size={20} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating chatbot button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-full bg-blue-600 px-5 py-4 text-white shadow-xl transition hover:-translate-y-1 hover:bg-blue-700 hover:shadow-2xl"
          aria-label="Open YAJU AI Assistant"
        >
          <MessageCircle
            size={25}
            className="transition-transform group-hover:scale-110"
          />

          <span className="hidden font-semibold sm:inline">
            Ask YAJU AI
          </span>

          <span className="font-semibold sm:hidden">
            Ask AI
          </span>
        </button>
      )}
    </div>
  );
}
