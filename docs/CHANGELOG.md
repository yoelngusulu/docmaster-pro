# Changelog

All notable changes to the YAJU Field Tools project are documented in this file.

## [0.7.0-alpha] - 2026-09-11

### Added

#### PDF and document tools

- Word to PDF.
- PDF to Word.
- PDF to Excel.
- PDF to PowerPoint.
- PDF to Image.
- Image to PDF.
- Merge PDF.
- Split PDF.
- Compress PDF.
- Protect PDF.
- Unlock PDF.

#### Image tools

- Compress Image.
- AI Image Editor pages and supporting AI processing route.
- Background Remover.
- Photo Enhancer.
- Object Remover.
- Face Retouch.
- Image Upscaler.
- Image Colorizer.
- Image to Text OCR.

#### GIS and field tools

- Coordinates Converter.
- CSV/Excel bulk coordinate conversion.
- GIS Distance and Area Calculator with CSV import, DMS and UTM inputs.
- GIS Bearing / Azimuth Calculator.
- Water Storage Calculator.
- Dedicated Field Tools hub and navigation category.

#### Platform features

- User registration, login, logout and password-reset flows.
- User dashboard and conversion history.
- Usage limits and usage recording.
- Pricing and About pages.
- Premium payment request flow and admin payment actions.
- Waitlist form.
- Reusable Google AdSense component and ad placements.
- Production sitemap and robots metadata.
- Tools hub pages and expanded tools navigation.

### Changed

- Rebranded the user interface from DocMaster to **YAJU Field Tools**.
- Updated the Navbar, Hero, About page, Footer, tool categories and supporting copy to use the YAJU identity.
- Prioritized coordinate and GIS tools across the homepage, calls to action and popular tools.
- Added the official YAJU logo, favicon and responsive wordmark treatment.
- Refined the header logo animation to use a subtle periodic tilt.
- Updated the project to the current Next.js 16 and React 19 dependency baseline.
- Expanded the upload and conversion interface to support multiple document, PDF and image workflows.

### Fixed

- Corrected the Bearing / Azimuth Calculator CSV error message.
- Fixed Coordinate Converter hero markup.
- Improved production metadata and private-route rules.
- Improved responsive text layout on the About page.
- Aligned branding across tool pages and category hubs.

### Current validation status

- The latest `main` deployment completed successfully on Vercel.
- Core PDF, image and GIS tools are implemented.
- AI tools are available in alpha and require additional individual testing.
- Native conversion tools may require environment-specific executables and production compatibility checks.

### Next steps

1. Smoke-test every PDF tool.
2. Smoke-test every image tool.
3. Smoke-test all GIS and field tools.
4. Test AI tools individually.
5. Polish Dashboard and Conversion History.
6. Complete premium-payment verification testing.
7. Resolve remaining production warnings.
8. Prepare the Beta release checklist.

---

## [0.1.0] - 2026-07-08

### Chapter 5 foundation

#### Backend setup

- Created `app/api/convert/route.ts`.
- Added the first Next.js API route using the App Router.
- Connected the frontend to the backend successfully.

#### Frontend and upload improvements

- Connected the **Convert to Word** button to the backend using `fetch()`.
- Added PDF selection through click and drag-and-drop.
- Displayed the selected filename and file size.
- Added file removal, conversion progress, loading, success and reset states.
- Added the first simulated download flow.

#### Project state at this milestone

- Landing page.
- PDF tools page.
- PDF to Word tool.
- Reusable upload component.
- Frontend-to-backend communication.

### Planned next step at the time

Send the selected PDF to the backend using `FormData` and prepare the backend for real PDF-to-Word conversion.
