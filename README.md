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
│   └── other-app.html          # Template — duplicate for each new app
├── support/
│   ├── index.html              # Contact details and app directory
│   ├── sumo.html               # Per-app support page
│   └── other-app.html          # Template — duplicate for each new app
├── assets/                     # Stylesheet and images
├── apple-app-site-association  # Universal links configuration
└── binding/                    # Mobile ID binding landing page
```

## Adding a new app (App Store submission)

1. Duplicate `privacy/other-app.html` and `support/other-app.html`, renaming them
   after the app (e.g. `privacy/myapp.html`).
2. Follow the TEMPLATE comment at the top of each file.
3. Add the app to the directories in `privacy/index.html` and `support/index.html`.
4. In App Store Connect, use the page URLs as the app's Privacy Policy URL and
   Support URL.

## Local preview

```
python3 -m http.server 8000
```

## License

MIT — see [LICENSE.txt](LICENSE.txt). Contact: [gelemias@gmail.com](mailto:gelemias@gmail.com)
