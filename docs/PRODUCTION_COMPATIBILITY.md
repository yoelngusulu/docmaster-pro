# DocMaster Production Compatibility

DocMaster is deployed publicly on Vercel. Vercel is suitable for the Next.js application, Supabase authentication, dashboard, billing, usage limits, AI API calls, and lightweight JavaScript-based conversion tools.

Some conversion routes depend on native runtimes such as QPDF, LibreOffice, or Python packages. These can work on local Windows when the tools are installed, but they are not guaranteed in Vercel serverless production.

## Vercel MVP Mode

For the public Vercel deployment, DocMaster should expose only tools that can produce real output on Vercel. Tools that require native/heavy server processing are shown in the interface as `Server soon` and their upload forms are hidden until a dedicated conversion worker is ready.

Live on Vercel now:

- Merge PDF
- Split PDF
- Compress PDF
- Image to PDF
- Coordinates Converter
- AI tools when the required server-side API keys are configured

Server processing coming soon:

- PDF to Word
- PDF to Excel
- PDF to PowerPoint
- PDF to Image
- Word to PDF
- Protect PDF
- Unlock PDF
- Compress Image

## Compatibility Matrix

| Tool | Current Engine | Native Dependency | Local Windows | Vercel | Future VPS | Status/Action |
|---|---|---|---|---|---|---|
| Merge PDF | `pdf-lib` | None | Works | Expected to work | Optional | Vercel-compatible as implemented |
| Split PDF | `pdf-lib` + `jszip` | None | Works | Expected to work | Optional | Vercel-compatible as implemented |
| Compress PDF | `pdf-lib` + `jszip` | None | Works | Expected to work | Optional | Vercel-compatible as implemented |
| Image to PDF | `pdf-lib` | None for JPG/JPEG/PNG | Works | Expected to work within Vercel request limits | Optional | Vercel-compatible after removing Python dependency |
| Coordinates Converter | `proj4`, `xlsx`, Leaflet/OpenStreetMap | None | Works | Expected to work | Optional | Vercel-compatible as implemented |
| AI/Image to Text | OpenAI API | No local binary | Works if API key is configured | Expected to work if API key is configured | Optional | Vercel-compatible with server-side `OPENAI_API_KEY` |
| Protect PDF | QPDF | `qpdf` executable | Works with QPDF installed | Hidden as server-coming-soon | Yes | Native runtime required; keep for worker/VPS |
| Unlock PDF | QPDF | `qpdf` executable | Works with QPDF installed | Hidden as server-coming-soon | Yes | Native runtime required; keep for worker/VPS |
| Word to PDF | LibreOffice | `soffice`/LibreOffice executable | Works with LibreOffice installed | Hidden as server-coming-soon | Yes | Native runtime required; keep for worker/VPS |
| PDF to Word | Python script | Python + `pdf2docx` + PyMuPDF | Works with Python deps installed | Hidden as server-coming-soon | Yes | Worker/VPS recommended for reliable document conversion |
| PDF to Excel | Python script | Python + `pdfplumber` + `pandas` + `openpyxl` | Works with Python deps installed | Hidden as server-coming-soon | Yes | Worker/VPS recommended for reliable table extraction |
| PDF to PowerPoint | Python script | Python + PyMuPDF + `python-pptx` | Works with Python deps installed | Hidden as server-coming-soon | Yes | Worker/VPS recommended for reliable presentation output |
| PDF to Image | Python script | Python + PyMuPDF | Works with Python deps installed | Hidden as server-coming-soon | Yes | Worker/VPS recommended for high-quality rendering |
| Image Compress | Python script | Python + Pillow | Works with Python deps installed | Hidden as server-coming-soon | Yes | Worker/VPS or browser-safe compression path recommended |

## Server-side Native Configuration

Only existing native dependencies are configurable for now.

Preferred environment variables:

```env
QPDF_PATH=
LIBREOFFICE_PATH=
PYTHON_EXECUTABLE=
```

Backward-compatible aliases are also supported:

```env
SOFFICE_PATH=
PYTHON_PATH=
```

These values must remain server-side only. Do not prefix them with `NEXT_PUBLIC_`.

## Runtime Behavior

If a native runtime is missing, affected API routes return a controlled `503` response:

```txt
This conversion service is temporarily unavailable on this server.
```

The API must not expose Windows paths, Linux paths, executable paths, stack traces, PDF passwords, Supabase secrets, or API keys to the client.

## Temporary Files

Conversion routes should write only to unique directories under `os.tmpdir()` and clean those directories in `finally` blocks. This is compatible with Vercel's writable `/tmp` area and with local Windows development.

## Future Conversion Worker

Recommended production architecture for native converters:

```txt
User
-> DocMaster Next.js on Vercel
-> DocMaster conversion API/worker
-> Linux VPS with LibreOffice, QPDF, Python packages
-> Converted file returned to DocMaster
```

Do not replace high-quality conversion engines with mock outputs just to make Vercel return HTTP 200. A converter should be considered working only when the generated output file is valid and usable.

## Deployment Notes

After pulling these changes, run `npm run build` locally. Vercel can continue serving portable tools immediately. Native routes should either stay marked as temporarily unavailable in Vercel or move later to a Linux VPS/worker with the required tools installed.
