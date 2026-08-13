# Bundled fonts

## Fredoka

- **Files:** `fredoka-latin.woff2` (latin subset), `fredoka-latin-ext.woff2` (latin-ext subset, carries the Polish diacritics ą ć ę ł ń ś ź ż)
- **Source:** Google Fonts — https://fonts.google.com/specimen/Fredoka
- **License:** SIL Open Font License 1.1 — https://openfontlicense.org
- **Copyright:** Copyright 2021 The Fredoka Project Authors (https://github.com/hafontia/Fredoka)

Both files are the variable version, so weights 300–700 are served from a single
face per subset. They are committed to the repo on purpose: the game ships as an
offline Android APK, where a request to a font CDN would fail and silently fall
back to the system sans-serif.

The `@font-face` declarations live in `src/index.css`. `build.assetsInlineLimit`
in `vite.config.ts` is raised above the largest file so the single-file web build
inlines them as data URIs instead of emitting separate assets.
