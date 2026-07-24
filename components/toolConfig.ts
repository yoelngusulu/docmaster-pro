export const toolConfig = {
  "pdf-to-word": {
  title: "PDF to Word",
  subtitle: "Convert PDF documents into editable Word files.",
  button: "Convert to Word",
  success: "Your Word document is ready.",
  accept: ".pdf",
  multiple: false,
},
  
"pdf-to-excel": {
  title: "PDF to Excel",
  subtitle: "Convert PDF tables into editable Excel spreadsheets.",
  button: "Convert to Excel",
  success: "Your Excel document is ready.",
  accept: ".pdf",
  multiple: false,
},
  
  "pdf-to-powerpoint": {
    title: "PDF to PowerPoint",
    subtitle: "Convert PDF into editable PowerPoint presentations.",
    button: "Convert to PowerPoint",
    success: "Your PowerPoint presentation is ready.",
    accept: ".pdf",
    multiple: false,
  },

  "pdf-to-image": {
    title: "PDF to Image",
    subtitle: "Convert PDF pages into high-quality image files.",
    button: "Convert to Image",
    success: "Your images are ready.",
    accept: ".pdf",
    multiple: false,
  },
"merge-pdf": {
  title: "Merge PDF",
  subtitle:
    "Combine multiple PDF files into one document.",
  accept: ".pdf",
  multiple: true,
  button: "Merge PDFs",
  success:
    "Your merged PDF is ready.",
},


  "split-pdf": {
    title: "Split PDF",
    subtitle: "Divide a PDF file into multiple smaller files.",
    button: "Split PDF",
    success: "Your split PDF is ready.",
    accept: ".pdf",
    multiple: false,
  },

  "compress-pdf": {
    title: "Compress PDF",
    subtitle: "Reduce the file size of your PDF documents.",
    button: "Compress PDF",
    success: "Your compressed PDF is ready.",
    accept: ".pdf",
    multiple: false,
  },

  "protect-pdf": {
    title: "Protect PDF",
    subtitle: "Add password protection to your PDF documents.",
    button: "Protect PDF",
    success: "Your protected PDF is ready.",
    accept: ".pdf",
    multiple: false,
  },
  "unlock-pdf": {
  title: "Unlock PDF",
  subtitle: "Remove password protection from your PDF documents.",
  button: "Unlock PDF",
  success: "Your unlocked PDF is ready.",
  accept: ".pdf",
  multiple: false,
},
"word-to-pdf": {
  title: "Word to PDF",
  subtitle: "Convert DOC and DOCX files to PDF.",
  accept: ".doc,.docx",
  multiple: false,
  button: "Convert to PDF",
  success: "Your PDF document is ready.",
},

"excel-to-pdf": {
  title: "Excel to PDF",
  subtitle: "Convert Excel spreadsheets into PDF.",
  button: "Convert to PDF",
  success: "Your PDF document is ready.",
  accept: ".xls,.xlsx",
  multiple: false,
},

"powerpoint-to-pdf": {
  title: "PowerPoint to PDF",
  subtitle: "Convert PowerPoint presentations into PDF.",
  button: "Convert to PDF",
  success: "Your PDF document is ready.",
  accept: ".ppt,.pptx",
  multiple: false,
},
"jpg-to-png": {
  title: "JPG to PNG",
  subtitle: "Convert JPG images into PNG format.",
  button: "Convert to PNG",
  success: "Your PNG image is ready.",
  accept: ".jpg,.jpeg",
  multiple: false,
},


"webp-to-jpg": {
  title: "WEBP to JPG",
  subtitle: "Convert WEBP images into JPG format.",
  button: "Convert to JPG",
  success: "Your JPG image is ready.",
  accept: ".webp",
  multiple: false,
},

"webp-to-png": {
  title: "WEBP to PNG",
  subtitle: "Convert WEBP images into PNG format.",
  button: "Convert to PNG",
  success: "Your PNG image is ready.",
  accept: ".webp",
  multiple: false,
},

"compress-image": {
  title: "Compress Image",
  subtitle: "Reduce image size without losing quality.",
  button: "Compress Image",
  success: "Your compressed image is ready.",
  accept: ".jpg,.jpeg,.png,.webp",
  multiple: false,
},


"png-to-jpg": {
  title: "PNG to JPG",
  subtitle: "Convert PNG images into JPG format.",
  button: "Convert to JPG",
  success: "Your JPG image is ready.",
  accept: ".png",
  multiple: false,
},


"crop-image": {
  title: "Crop Image",
  subtitle: "Crop images quickly and precisely.",
  button: "Crop Image",
  success: "Your cropped image is ready.",
  accept: ".jpg,.jpeg,.png,.webp",
  multiple: false,
},


  "image-editor": {
    title: "AI Image Editor",
    subtitle:
      "Edit, retouch, recolor, enhance and transform your images using AI.",
    button: "Edit Image",
    success: "Your edited image is ready.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "background-remover": {
    title: "Background Remover",
    subtitle: "Remove image backgrounds automatically with AI.",
    button: "Remove Background",
    success: "Your background has been removed.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "photo-enhancer": {
    title: "Photo Enhancer",
    subtitle: "Improve image quality, sharpness and lighting.",
    button: "Enhance Photo",
    success: "Your enhanced photo is ready.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "object-remover": {
    title: "Object Remover",
    subtitle: "Remove unwanted objects from your images.",
    button: "Remove Object",
    success: "Your edited image is ready.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "face-retouch": {
    title: "Face Retouch",
    subtitle: "Retouch portraits with AI.",
    button: "Retouch Face",
    success: "Your retouched image is ready.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "image-upscaler": {
    title: "Image Upscaler",
    subtitle: "Increase image resolution without losing quality.",
    button: "Upscale Image",
    success: "Your upscaled image is ready.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "image-colorizer": {
    title: "Image Colorizer",
    subtitle: "Add realistic colors to black and white photos.",
    button: "Colorize Image",
    success: "Your colorized image is ready.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

  "image-to-text": {
    title: "Image to Text (OCR)",
    subtitle: "Extract editable text from images using AI.",
    button: "Extract Text",
    success: "Your text has been extracted.",
    accept: ".jpg,.jpeg,.png,.webp",
    multiple: false,
  },

} as const;