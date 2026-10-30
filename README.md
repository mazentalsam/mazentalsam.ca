# mazentalsam.com — personal portfolio

Personal site for **Mazen Talsam**: CS at Wilfrid Laurier, founder of [csjobs.ca](https://csjobs.ca), incoming Software Engineer co-op at TD.

Live at [mazentalsam.com](https://mazentalsam.com)

## Features

- **3D hero**: keycaps printed with my stack drift around under shuffling tiles and move away from the cursor (three.js)
- **Terminal**: press `/` or `⌘K` for `whoami`, `projects`, `cd`, `resume` and a few hidden commands
- **Right now**: what I'm building, plus a muay thai strike counter and a soccer juggling game
- **Experience**: draggable ID badges that swing on a lanyard
- **Projects**: sticky stacked cards with live-site and GitHub links
- **Ship log**: a live GitHub contribution graph that marks the current "locked in" streak
- One-click resume download, a footer revealed under the page, smooth scrolling, and a reduced-motion mode

## Tech stack

- HTML, CSS and vanilla JavaScript, with no build step
- [three.js](https://threejs.org) for the hero and [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling, both from a CDN
- Fonts: Space Grotesk, Instrument Serif, JetBrains Mono

## Run locally

```sh
python -m http.server 8000
```

Then open http://localhost:8000. The 3D hero needs a server; opening the file directly skips it.

## Projects featured

- **[csjobs.ca](https://csjobs.ca)**: AI-powered job board for Canadian CS students ([code](https://github.com/mazentalsam/csjobs.ca))
- **[Ruhly](https://ruhly.app)**: daily Quran and hadith reflection app ([code](https://github.com/mazentalsam/ruhly-app))
- **Autofill**: Manifest V3 Chrome extension for job applications ([code](https://github.com/mazentalsam/csjobs-autofill))

## Contact

- Email: mazentbusiness@gmail.com
- GitHub: [github.com/mazentalsam](https://github.com/mazentalsam)
- LinkedIn: [linkedin.com/in/mazen-talsam](https://www.linkedin.com/in/mazen-talsam)
