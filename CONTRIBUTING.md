# Contributing to ImageDiet

Thanks for helping make ImageDiet better. Contributions are welcome, especially improvements to image quality, browser compatibility, accessibility, privacy, and the batch workflow.

## Before You Start

1. Search existing issues before opening a new one.
2. For a large change, open an issue first so the direction can be discussed.
3. Keep image processing local. Do not add an upload service or send image data to a third party.

## Local Development

Requirements:

- Node.js 20 or newer
- npm

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Making Changes

1. Fork the repository and create a focused branch.
2. Keep changes small and explain the user-facing reason for them.
3. Preserve the existing visual language and responsive behavior.
4. Add or update tests when behavior changes. At minimum, verify the changed workflow in a browser.
5. Run `npm run build` before opening a pull request.
6. Update the README or other documentation when the public behavior changes.

## Pull Requests

Please include:

- What changed and why
- How you verified it
- Screenshots or a short recording for visual changes
- Any browser limitations or known follow-up work

Keep pull requests focused. Avoid mixing unrelated refactors with a feature or bug fix.

## Commit Messages

Use a short, imperative message with a type when possible:

```text
feat: add target-size compression
fix: handle unsupported AVIF encoding
 docs: explain local processing
```

## Privacy Expectations

ImageDiet is local-first. Contributions must not upload, persist, inspect, or transmit image contents or metadata without an explicit, documented user action.

## Code Of Conduct

By participating, you agree to follow the project [Code of Conduct](CODE_OF_CONDUCT.md).
