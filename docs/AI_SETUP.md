# AI API Setup

DocMaster AI uses the server-side route at `/api/ai/process`.

Required environment variable:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-miniz
```

Optional environment variable:

```bash
OPENAI_MODEL=gpt-5-mini
```

Supported AI tools:

- AI Image Editor
- Background Remover
- Photo Enhancer
- Object Remover
- Face Retouch
- Image Upscaler
- Image Colorizer
- Image to Text OCR
- Summarize PDF
- Chat with PDF
- Translate Document
- Resume Builder

The API returns a downloadable `.txt` result for each tool. Image tools use uploaded images as vision input. Document tools upload the file to the AI provider for processing, then remove the uploaded provider file after the response completes.
