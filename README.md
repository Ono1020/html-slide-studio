# HTML Slide Studio

A local-first visual editor for single-file HTML slide presentations. Import an HTML deck, edit its text directly in an isolated preview, navigate between slides, and export a standalone HTML file. Your presentation is processed in your browser and is not uploaded to a server.

## Features

- Import standalone `.html` and `.htm` presentations.
- Automatically split top-level `<section>` elements into slides. Documents without sections are treated as a single slide.
- Preview slides in a sandboxed iframe to isolate presentation styles from the editor.
- Click text in the preview to edit it in place. Text edits, including line breaks, are synchronized to the slide.
- Navigate from the slide sidebar, canvas controls, or presentation keyboard shortcuts.
- Export an HTML file while preserving the source document's head, styles, scripts, and surrounding content.
- Use a responsive editor with light and dark themes.
- Build as a static site for GitHub Pages.

## Getting started

### Requirements

- Node.js 20.19+ or 22.12+
- npm

### Install and run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

### Production build

```bash
npm run build
npm run preview
```

The optimized static site is written to `dist/`.

### Quality checks

```bash
npm run lint
npm test
```

## Usage

1. Select **Import HTML** and choose a presentation file.
2. Choose a slide in the left sidebar, or use the previous/next controls.
3. Click text in the preview to edit it. Keyboard editing keys remain available while text is focused.
4. Select **Export HTML** to download the updated presentation.

Presentation files remain in the browser. No application backend or upload service is used.

## GitHub Pages deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs lint, tests, and a production build when changes are pushed to `main`, then deploys the `dist/` artifact to GitHub Pages. In the repository settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md), open an issue for substantial changes, and submit a pull request with a clear description and relevant test results.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
