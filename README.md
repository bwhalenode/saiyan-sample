# SAIYAN website

Static multi-page website built with Vite, Three.js, GSAP, and Lenis. The main
page includes the Creator and opens the Hall without interrupting its soundtrack.
The Hall also has a standalone entry point at `/gallery.html`; the game shell
lives at `/play.html`.

## Local development

Use Node.js 22 or newer and npm. From the project folder:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and set the public API configuration when
working on the Creator or Hall. Restart Vite after changing these values.

| Variable                     | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `VITE_AUTH_API_BASE`         | Backend URL for Telegram sessions and membership checks.       |
| `VITE_TELEGRAM_BOT_USERNAME` | Telegram bot username, without `@`.                            |
| `VITE_SAIYAN_JOIN_URL`       | Telegram community join URL.                                   |
| `VITE_AI_API_BASE`           | Optional generation API URL; defaults to `VITE_AUTH_API_BASE`. |

Vite embeds `VITE_` values in the browser bundle. Use public configuration only;
provider keys and bot tokens belong in the separate backend repository. When the
generation API is unset, the Creator reports that the service is offline.

## Source layout

- `src/main.js`: landing page initialization.
- `src/sections/`: page interactions, shared audio, and Creator UI.
- `src/sections/ai/`: browser API client, session transport, and public configuration.
- `src/scene/` and `src/scroll/`: WebGL rendering, shaders, and scroll animation.
- `src/preloader/`: landing page loading and entry sequence.
- `src/gallery/`: Hall view and its standalone preloader.
- `public/`: assets copied directly into the build.
- `image-src/`: source artwork used by `scripts/optimize-images.js`.

The CSS cascade depends on rule order. Keep selectors, declaration order, and
breakpoints intact during formatting changes. HTML and shaders are outside the
formatter's target list to preserve their existing whitespace.

## Checks and builds

```sh
npm run format:check
npm run lint
npm run build
npm run preview
```

Use `npm run format` to apply the shared formatting rules. Run
`npm run optimize:images` only when intentionally regenerating image assets.

Before releasing, check desktop and mobile entry, sound controls, Hall navigation
and browser Back, Creator login and generation, and the buy dialog. Lint and build
checks do not exercise the external backend.

## Production

`main` is the source of truth. The production worktree should receive an approved
release from main rather than maintain a separate teaser implementation. Keep
machine-specific environment files and hosting credentials out of Git.

Vite builds all three pages into `dist/`. The repository includes Vercel and
Cloudflare static-asset configuration; use the project's chosen hosting workflow.
Set the public API variables in the hosting environment before building a release.
Updating the local production worktree does not publish the website.
