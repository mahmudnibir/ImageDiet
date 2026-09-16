# ImageDiet

**Bulk image processing, without the upload.**

ImageDiet is a local-first image optimization workspace for processing one image or hundreds at once. Resize, compress and convert images in your browser, then download the result as a ZIP.

## Why ImageDiet?

Most image tools are built around one file at a time. ImageDiet is built around a **recipe**: define the transformation once and apply it to a batch.

- Bulk image processing
- Resize by longest side or percentage
- JPEG, PNG, WebP and AVIF output where supported by the browser
- Adjustable quality
- Don't enlarge smaller images
- Quick optimization presets
- ZIP export
- Client-side processing — images are not uploaded to a server
- No account, backend or image storage required

## Local-first

Your images are processed in the browser. ImageDiet does not need an image upload endpoint to perform its core workflow.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Roadmap

ImageDiet is intentionally starting with a small but real processing engine. Planned capabilities include:

- Width / height / fit / cover / crop resize modes
- Target file-size optimization
- Metadata controls
- Filename templates and numbering
- Folder import and folder-structure preservation
- Per-image overrides
- Before/after previews and savings estimates
- Multi-output recipes (responsive sizes + multiple formats)
- Saved custom recipes
- Offline/PWA support
- More reliable browser capability detection and graceful fallbacks

## License

MIT
