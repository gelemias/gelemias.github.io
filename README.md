# gelemias.github.io

Personal website of Guillermo Rodriguez Delgado — iOS Software Engineer & Mobile Architect.

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
├── assets/                     # Stylesheet and images
├── apple-app-site-association  # Universal links configuration
└── binding/                    # Mobile ID binding landing page
```

## Adding a new app (App Store submission)

1. Duplicate an existing per-app pair, e.g. `privacy/turn-siege.html` and
   `support/turn-siege.html`, renaming them after the app (e.g. `privacy/myapp.html`).
2. Replace every mention of the old app's name and review each section against
   the new app's real data practices — they must match the App Privacy answers
   given in App Store Connect.
3. Add the app to the directories in `privacy/index.html` and `support/index.html`.
4. In App Store Connect, use the page URLs as the app's Privacy Policy URL and
   Support URL.

## Local preview

```
python3 -m http.server 8000
```

## License

MIT — see [LICENSE.txt](LICENSE.txt). Contact: [gelemias@gmail.com](mailto:gelemias@gmail.com)
