# Lone Star ITS — Private AI

Marketing website for **Lone Star ITS Private AI**: on-premises AI systems installed and managed by Lone Star ITS, so a customer's data never leaves their building.

**Live site:** https://elspaniard97.github.io/custom-ai-models/

Main company site: https://lonestar-its.com/ (source: `ecorrea-ceo/lone-star-its`). This site reuses its visual system (`style.css`, logos).

## Tiers

| Tier | Users | System |
|---|---|---|
| Office AI | 5-10 | Quiet desktop system (Mac Studio class, 128GB) |
| Business AI | 15-30 | Single-GPU server |
| Enterprise AI | 30+ | Multi-GPU server, optional backup server |

## Pricing

Pricing is not published. Every customer requests a quote, and the site's buttons all lead to the request form. Pricing structure:

- **Office AI:** one all-in monthly payment over 12, 24, 36 or 48 months (setup, equipment and support). After the term, support continues monthly.
- **Business AI and Enterprise AI:** setup and equipment paid up front (half at signing, balance on delivery), plus a monthly support plan. No financing.

Dollar figures live in the private business plan, not in this public repository.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage: what it is, secure / private / managed |
| `solutions.html` | The three tiers |
| `security.html` | Security and privacy baseline |
| `contact.html` | Request a quote; links to the main site's contact form |
| `style.css` | Lone Star ITS styles plus a "Private AI additions" section at the end |
| `main.js` | Dark mode and mobile menu |

## Run locally

```bash
python3 -m http.server 4180
```

## Deploy

Settings → Pages → Deploy from a branch → `main` / root. No build step.

## Notes

- The Content Security Policy blocks inline styles and scripts; put styles in `style.css`.
- Do not claim regulatory compliance (for example HIPAA); say systems are designed to keep data on premises.
