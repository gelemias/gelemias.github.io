# gelemias.github.io

Personal website of Guillermo Rodríguez Delgado — iOS Software Engineer & Mobile Architect.

Plain static HTML/CSS site served by GitHub Pages — no build step, no dependencies
(`.nojekyll` disables the Jekyll build entirely).

## Structure

```
├── index.html                  # Portfolio / CV — nine pages
├── privacy/
│   ├── index.html              # General privacy policy and app directory
│   ├── sumo.html               # Per-app privacy policy
│   ├── turn-siege.html         # Per-app privacy policy
│   └── jumpy-chewie.html       # Per-app privacy policy
├── support/
│   ├── index.html              # Contact details and app directory
│   ├── sumo.html               # Per-app support page
│   ├── turn-siege.html         # Per-app support page
│   └── jumpy-chewie.html       # Per-app support page
├── assets/                     # Stylesheets, scripts and images
├── apple-app-site-association  # Universal links configuration
└── binding/                    # Mobile ID binding landing page
```

## Pages

`index.html` is nine pages, each at least a screen tall, read in order:

```
00 intro    01 profile    02 path-a / path-b
03 work-a / work-b / work-c    04 toolkit    05 contact
```

Long sections are split across lettered pages rather than trimmed, so a page
grows past a screen when it has to (narrow viewports especially) — the plate
only ever covers the first screenful.

## The play shell (`assets/js/qix.js`)

Each page ships behind a sheet the colour of the paper it lies on. You steer a
marker along the edge of what you have claimed, push into the sheet to draw, and
close the line back on an edge — everything the drifter can no longer reach is
cut away and the page underneath shows through. Clear a page and the rest of the
sheet dissolves and you are scrolled to the next one, so cutting is what moves
you down the site.

It is strictly an overlay. `index.html` stays the only source of content, so the
text is always in the DOM for search engines and screen readers. The shell steps
aside entirely when JS is off, on `prefers-reduced-motion`, or once the reader
presses **READ** in the nav — which is remembered, as is how far they got. The
footer is never gated, and the privacy and support pages never load it at all.

Pages, their targets and the headings pre-cut into each sheet are the `LEVELS`
table at the top of the file. A target is a share of the field *left* after the
headings are cut, not of the whole sheet.

## Adding a new app (App Store submission)

1. Duplicate an existing app's pages (e.g. `privacy/sumo.html` and
   `support/sumo.html`), renaming them after the app (e.g. `privacy/myapp.html`).
2. Replace every occurrence of the old app name and review each section against
   the app's real data practices.
3. Add the app to the directories in `privacy/index.html` and `support/index.html`.
4. In App Store Connect, use the page URLs as the app's Privacy Policy URL and
   Support URL.

## Local preview

```
python3 -m http.server 8000
```

## License

MIT — see [LICENSE.txt](LICENSE.txt). Contact: [gelemias@gmail.com](mailto:gelemias@gmail.com)
