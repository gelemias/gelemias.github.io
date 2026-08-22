# gelemias.github.io

Personal website of Guillermo Rodríguez Delgado — iOS Software Engineer & Mobile Architect.

Plain static HTML/CSS site served by GitHub Pages — no build step, no dependencies
(`.nojekyll` disables the Jekyll build entirely).

## Structure

```
├── index.html                  # Portfolio / CV
├── privacy/
│   ├── index.html              # General privacy policy and app directory
│   ├── sumo.html               # Per-app privacy policy
│   └── turn-siege.html         # Per-app privacy policy
├── support/
│   ├── index.html              # Contact details and app directory
│   ├── sumo.html               # Per-app support page
│   └── turn-siege.html         # Per-app support page
├── assets/                     # Stylesheets, scripts and images
├── apple-app-site-association  # Universal links configuration
└── binding/                    # Mobile ID binding landing page
```

## The play shell (`assets/js/qix.js`)

The portfolio ships behind Qix-style metal plates: you steer a marker along the
edge of what you have claimed, push into the plate to draw, and close the line
back on an edge — everything the Qix can no longer reach is cut away and the
section underneath shows through. Claim enough of a sector and the rest
dissolves and the next one unlocks.

It is strictly an overlay. `index.html` is the ordinary portfolio and stays the
only source of content, so the text is always in the DOM for search engines and
screen readers. The shell steps aside entirely when JS is off, on
`prefers-reduced-motion`, or once the reader presses **READ** in the nav — which
is remembered, as is how far they got. The privacy and support pages never load
it at all.

Sectors, their targets and the headings pre-cut into each plate are the `LEVELS`
table at the top of the file. A target is a share of the field *left* after the
headings are cut, not of the whole plate.

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
