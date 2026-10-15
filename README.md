# Lone Star ITS — Private AI

Marketing website for **Lone Star ITS Private AI**: on-premises AI systems installed and managed by Lone Star ITS, so a customer's data never leaves their building.

GitHub Pages URL (once Pages is enabled): https://elspaniard97.github.io/custom-ai-models/

Main company site: https://lonestar-its.com/ (source: `ecorrea-ceo/lone-star-its`). This site reuses its visual system (`style.css`, logos) so the two read as one brand.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage: why private AI, how it works, use cases, industries |
| `solutions.html` | Office / Business / Enterprise system tiers and comparison |
| `security.html` | Security & privacy baseline included with every install |
| `pricing.html` | Pricing structure: fixed setup fee, equipment over 1-4 years, separate monthly support (quote-based, no prices published) |
| `contact.html` | Contact details; the message button uses the main site's contact form |
| `style.css` | Lone Star ITS styles plus a "Private AI additions" section at the end |
| `main.js` | Dark mode and mobile menu |

## Run locally

```bash
python3 -m http.server 4180
```

Open http://localhost:4180/

## Deploy

Settings → Pages → Build and deployment → Deploy from a branch → `main` / root. No build step.

## Notes

- Content Security Policy is set by meta tag and blocks inline styles and scripts; put styles in `style.css`.
- Do not claim regulatory compliance (for example HIPAA) on the site; say systems are designed to keep data on premises.
- Prices are not published; every quote is built after an assessment.
