# ImageDiet

**Bulk image optimization, without the upload.**

ImageDiet is a local-first image workspace for turning a folder of heavy images into a clean, web-ready batch. Build one optimization recipe, apply it to up to 500 files, and download the result as a ZIP. Your images stay in your browser.

[![MIT License](https://img.shields.io/badge/license-MIT-171717.svg)](LICENSE)
[![Built with React](https://img.shields.io/badge/built%20with-React-171717.svg)](https://react.dev/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mahmudnibir/ImageDiet)

<p align="center">
  <a href="https://github.com/mahmudnibir/ImageDiet">Source code</a> ·
  <a href="https://github.com/mahmudnibir/ImageDiet/issues">Issues</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="SECURITY.md">Security</a>
</p>

## Why ImageDiet?

Most image tools make you repeat the same decision for every file. ImageDiet treats those decisions as a **recipe**:

> Resize to 1600px → convert to WebP → quality 82 → rename → download one ZIP.

That makes it useful for developers, designers, photographers, and anyone preparing a large upload.

## Features

- Drag and drop images into a batch
- Select multiple files or an entire folder
- Paste images directly from the clipboard
- Process up to 500 images in one recipe
- Resize by longest side, width, height, both dimensions, fit, or percentage
- Contain, cover/crop, stretch, and smart-crop modes
- Convert to JPEG, PNG, WebP, AVIF, or keep the original
- Tune quality and optionally target a maximum file size
- Prevent enlargement of smaller images
- Preserve folder structure when importing folders
- Rename with suffixes, prefixes, or numbered patterns
- Strip metadata through browser canvas re-encoding
- Apply quick presets for web, thumbnails, social, email, and web assets
- Export all results as one ZIP file
- No account, backend, upload endpoint, or image storage

## Local-first architecture

ImageDiet runs the image pipeline in the browser:

```text
Files → Browser → Decode → Resize → Encode → ZIP
```

The application does not upload your images to an ImageDiet server. The only network request in the interface is an optional request for public GitHub repository information. Image contents and image metadata are not sent with it.

Browser support for image codecs varies. If a browser cannot encode a selected format, ImageDiet reports that clearly instead of silently falling back to a larger format.

## Quick start

Requirements:

- Node.js 20 or newer
- npm

```bash
git clone https://github.com/mahmudnibir/ImageDiet.git
cd ImageDiet
npm install
npm run dev
```

Open the local URL printed by Vite, drop in a few images, choose a recipe, and click **Optimize**.

## Production build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Deploy to Vercel

Import the repository into Vercel. The project is already configured for Vite:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |

You can also use the **Deploy with Vercel** button above.

## Project structure

```text
ImageDiet/
├── public/                  # Static brand assets
├── src/
│   ├── main.jsx             # React application and local processing pipeline
│   └── styles.css           # Responsive visual system
├── .github/                 # Issue and pull request templates
├── index.html               # Vite entry document
├── vite.config.js           # Vite configuration
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE
```

## Roadmap

- Before/after comparison slider
- Per-image overrides
- More reliable browser capability detection
- Saved custom recipes
- Multiple output versions such as WebP, AVIF, and thumbnail sets
- Offline/PWA support
- Automated browser tests
- Optional worker-based processing for large batches

Ideas and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) before starting work.

## Privacy

ImageDiet is built around the principle that image optimization should not require image uploads. Read the privacy details in the app and the project [security policy](SECURITY.md).

## Contributing

Bug reports, codec compatibility notes, accessibility improvements, documentation, and performance work are all valuable. Please use the issue templates and read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

ImageDiet is available under the [MIT License](LICENSE).

Built by [Mahmud Nibir](https://github.com/mahmudnibir).
