import UploadArea from "@/components/UploadArea";

export default function WordToPdfPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <UploadArea tool="word-to-pdf" />
    </main>
  );
}