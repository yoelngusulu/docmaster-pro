export default function UploadBox() {
  return (
    <div className="mx-auto mt-12 max-w-3xl rounded-3xl border-2 border-dashed border-blue-300 bg-white p-12 shadow-xl">

      <div className="text-center">

        <div className="text-6xl">📄</div>

        <h2 className="mt-4 text-2xl font-bold text-gray-800">
          Drag & Drop Your File
        </h2>

        <p className="mt-2 text-gray-500">
          or click below to browse your computer
        </p>

        <button className="mt-8 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700">
          Choose File
        </button>

      </div>

    </div>
  );
}