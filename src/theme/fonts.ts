// OpenFall bundles its fonts locally (offline desktop app — no Google Fonts at
// runtime). @fontsource ships the woff2 files; these side-effect imports inject
// the @font-face rules and let Vite fingerprint + (for the portable build) inline
// the font assets.
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/newsreader/500.css'
import '@fontsource/newsreader/600.css'
