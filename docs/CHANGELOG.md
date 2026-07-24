# Changelog

## Date

2026-07-08

## Chapter 5 Progress

### ✅ Backend Setup

* Created `app/api/convert/route.ts`.
* Added the first Next.js API Route using the App Router.
* Tested the API route successfully.
* Confirmed frontend can communicate with backend.

### ✅ Frontend Improvements

* Connected the **Convert to Word** button with the backend using `fetch()`.
* Replaced the previous standalone simulation with a backend request followed by the existing progress simulation.
* Confirmed the browser receives a successful JSON response from the backend.

### ✅ Upload Features

* Click to upload PDF.
* Drag & Drop upload.
* Display selected file name.
* Display file size.
* Remove selected file.
* Conversion progress bar.
* Loading spinner.
* Conversion success screen.
* Download simulation.
* Convert another file.

### ✅ Current Project Status

The application now includes:

* Landing Page
* PDF Tools Page
* PDF to Word Tool
* Upload Component
* Drag & Drop Support
* Backend API Route
* Frontend ↔ Backend communication

### Next Session Plan

Continue with Chapter 5 by sending the uploaded PDF file to the backend using `FormData`, then prepare the backend for real PDF-to-Word conversion.
