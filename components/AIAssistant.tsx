"use client";

import Link from "next/link";
import {
  Bot,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  id: number;
  sender: "user" | "bot";
  text: string;
  link?: {
    label: string;
    href: string;
  };
};

type BotReply = Omit<ChatMessage, "id">;

const quickActions = [
  "PDF to Word",
  "Word to PDF",
  "Compress PDF",
  "Remove Background",
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
      id: 1,
      sender: "bot",
      text:
        "👋 Welcome to DocMaster AI!\n\nI can help you convert PDFs, Office documents and images.\n\nTell me what you would like to do today.",
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

  const getBotReply = (
    userMessage: string
  ): BotReply => {
    const text = userMessage.toLowerCase();

    if (
      text.includes("pdf to word") ||
      text.includes("convert pdf to word")
    ) {
      return {
        sender: "bot",
        text:
          "I found the PDF to Word tool. Open it to upload your PDF.",
        link: {
          label: "Open PDF to Word",
          href: "/tools/pdf/pdf-to-word",
        },
      };
    }

    if (
      text.includes("pdf to excel") ||
      text.includes("convert pdf to excel")
    ) {
      return {
        sender: "bot",
        text:
          "Use PDF to Excel to convert PDF tables into an editable spreadsheet.",
        link: {
          label: "Open PDF to Excel",
          href: "/tools/pdf/pdf-to-excel",
        },
      };
    }

    if (
      text.includes("pdf to powerpoint") ||
      text.includes("pdf to ppt")
    ) {
      return {
        sender: "bot",
        text:
          "You can convert your PDF into a PowerPoint presentation.",
        link: {
          label: "Open PDF to PowerPoint",
          href: "/tools/pdf/pdf-to-powerpoint",
        },
      };
    }

    if (
      text.includes("word to pdf") ||
      text.includes("convert word to pdf")
    ) {
      return {
        sender: "bot",
        text:
          "You can convert a Word document using the Word to PDF tool.",
        link: {
          label: "Open Word to PDF",
          href: "/tools/office/word-to-pdf",
        },
      };
    }

    if (
      text.includes("excel to pdf") ||
      text.includes("spreadsheet to pdf")
    ) {
      return {
        sender: "bot",
        text:
          "Use Excel to PDF to convert your spreadsheet.",
        link: {
          label: "Open Excel to PDF",
          href: "/tools/office/excel-to-pdf",
        },
      };
    }

    if (
      text.includes("powerpoint to pdf") ||
      text.includes("ppt to pdf")
    ) {
      return {
        sender: "bot",
        text:
          "Use PowerPoint to PDF to convert your presentation.",
        link: {
          label: "Open PowerPoint to PDF",
          href:
            "/tools/office/powerpoint-to-pdf",
        },
      };
    }

    if (
      text.includes("compress") &&
      text.includes("pdf")
    ) {
      return {
        sender: "bot",
        text:
          "Use Compress PDF to reduce your PDF file size.",
        link: {
          label: "Open Compress PDF",
          href: "/tools/pdf/compress-pdf",
        },
      };
    }

    if (
      text.includes("merge") &&
      text.includes("pdf")
    ) {
      return {
        sender: "bot",
        text:
          "You can combine multiple PDF files using Merge PDF.",
        link: {
          label: "Open Merge PDF",
          href: "/tools/pdf/merge-pdf",
        },
      };
    }

    if (
      text.includes("split") &&
      text.includes("pdf")
    ) {
      return {
        sender: "bot",
        text:
          "Use Split PDF to divide a document into smaller PDF files.",
        link: {
          label: "Open Split PDF",
          href: "/tools/pdf/split-pdf",
        },
      };
    }

    if (
      text.includes("protect") &&
      text.includes("pdf")
    ) {
      return {
        sender: "bot",
        text:
          "Use Protect PDF to add password protection.",
        link: {
          label: "Open Protect PDF",
          href: "/tools/pdf/protect-pdf",
        },
      };
    }

    if (
      text.includes("unlock") &&
      text.includes("pdf")
    ) {
      return {
        sender: "bot",
        text:
          "Use Unlock PDF to remove password protection from your document.",
        link: {
          label: "Open Unlock PDF",
          href: "/tools/pdf/unlock-pdf",
        },
      };
    }

    if (
      text.includes("remove background") ||
      text.includes("background remover")
    ) {
      return {
        sender: "bot",
        text:
          "The Background Remover can help remove the background from your image.",
        link: {
          label: "Open Background Remover",
          href:
            "/tools/ai/background-remover",
        },
      };
    }

    if (
      text.includes("image editor") ||
      text.includes("edit image") ||
      text.includes("retouch")
    ) {
      return {
        sender: "bot",
        text:
          "Open AI Image Editor to enhance, retouch, colorize or upscale your image.",
        link: {
          label: "Open AI Image Editor",
          href: "/tools/ai/image-editor",
        },
      };
    }

    if (
      text.includes("jpg to png") ||
      text.includes("jpeg to png")
    ) {
      return {
        sender: "bot",
        text:
          "Use JPG to PNG to convert your image.",
        link: {
          label: "Open JPG to PNG",
          href: "/tools/image/jpg-to-png",
        },
      };
    }

    if (text.includes("png to jpg")) {
      return {
        sender: "bot",
        text:
          "Use PNG to JPG to convert your image.",
        link: {
          label: "Open PNG to JPG",
          href: "/tools/image/png-to-jpg",
        },
      };
    }

    if (text.includes("webp to jpg")) {
      return {
        sender: "bot",
        text:
          "Use WEBP to JPG to convert the image format.",
        link: {
          label: "Open WEBP to JPG",
          href: "/tools/image/webp-to-jpg",
        },
      };
    }

    if (text.includes("webp to png")) {
      return {
        sender: "bot",
        text:
          "Use WEBP to PNG to convert the image format.",
        link: {
          label: "Open WEBP to PNG",
          href: "/tools/image/webp-to-png",
        },
      };
    }

    return {
      sender: "bot",
      text:
        "I can help you find PDF, Office, Image and AI tools.\n\nTry asking:\n• Convert PDF to Word\n• Merge PDF\n• Compress PDF\n• Remove image background",
    };
  };

  const sendMessage = (
    rawMessage: string
  ) => {
    const cleanedMessage =
      rawMessage.trim();

    if (!cleanedMessage || isTyping) return;

    const userChatMessage: ChatMessage = {
      id: Date.now(),
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
          id: Date.now() + 1,
        },
      ]);

      setIsTyping(false);
    }, 900);
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
                  DocMaster AI
                </h3>

                <p className="text-xs text-blue-100">
                  AI Assistant • Online
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

                    {chatMessage.link && (
                      <Link
                        href={
                          chatMessage.link
                            .href
                        }
                        onClick={() =>
                          setIsOpen(false)
                        }
                        className="mt-3 inline-block rounded-lg bg-white px-3 py-2 font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50"
                      >
                        {
                          chatMessage.link
                            .label
                        }{" "}
                        →
                      </Link>
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
                      DocMaster AI is typing
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

          {/* Quick actions */}
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
                placeholder="Ask DocMaster AI..."
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
          aria-label="Open DocMaster AI Assistant"
        >
          <MessageCircle
            size={25}
            className="transition-transform group-hover:scale-110"
          />

          <span className="hidden font-semibold sm:inline">
            Ask DocMaster AI
          </span>

          <span className="font-semibold sm:hidden">
            Ask AI
          </span>
        </button>
      )}
    </div>
  );
}