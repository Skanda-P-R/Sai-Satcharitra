# Shri Sai Satcharitra — Modern E-Reader

> **"Bow to Shri Sai — Peace be to all"**

An elegant, devotional, physical-book style static E-Reader for **Shri Sai Satcharitra** (*The Life and Teachings of Shirdi Sai Baba*), originally written in Marathi verse by **Shri Govind Raghunath Dabholkar (Hemadpant)** and translated into English by **Nagesh Vasudev Gunaji**.

Designed specifically for seamless reading, weekly **Saptah Parayan**, and instant deployment on **GitHub Pages**.

---

## ✨ Features

### 📖 Authentic Physical Book E-Reader
- **Realistic Two-Page Spread**: Designed to feel like a real open book with a subtle 3D central spine shadow, page borders, running headers, and footers with page numbers.
- **Single Page on Mobile**: Automatically adapts to a single-page view on phones and portrait tablets.
- **Page-Turning Animations**: Smooth page turn transitions with an optional synthesized paper rustle sound effect (built with the Web Audio API — zero audio files to download).
- **Multiple Navigation Options**: Turn pages via on-screen arrow zones, keyboard arrow keys (`←` / `→`), `Spacebar`, `PageUp` / `PageDown`, or touch swipe gestures on mobile.
- **Continuous Scroll View**: Easily switch between **Book View** and **Continuous Scroll View** via the top toolbar button.

### 🔖 Interactive Bookmark & Save Point System
- **Save Point at Current View**: 1-click bookmarking of your active page or paragraph.
- **"Pick in Text" Targeting Mode**: Interactive mode that lets you hover over any paragraph in the text to pin a bookmark with a custom label or devotional note.
- **Direct Paragraph Pins**: Hovering over any paragraph margin displays a subtle bookmark pin for instantaneous bookmarking.
- **Visual In-Text Badges & Highlights**: Bookmarked paragraphs receive a golden ribbon badge and a warm amber ambient highlight.
- **Smart Resume on Reopening**:
  - Automatically records your reading position (chapter, page, exact paragraph) in `localStorage`.
  - When you return or reopen the app, an elegant **"Resume Reading"** banner appears: *"Welcome back! You were reading Chapter IV, Page 3"*.
  - Clicking **Resume** takes you straight to that chapter, flips to the page, and highlights the saved paragraph with an animated gentle pulsing golden glow (`savePointPulse`) so your eyes immediately catch where you stopped!
- **Bookmarks Drawer**: Easily browse, search, jump to, or delete your bookmarks across all chapters.

### 🧭 Global Chapter Navigation (Instant Access)
- **Table of Contents Drawer**: Accessible from anywhere via the hamburger button, clicking the current chapter header, or pressing `T` / `C`.
- **Searchable Index**: Search chapters in real-time by title, chapter number, or key topics (e.g. "grinding", "Cholera", "Udi", "Brahma-Jnana", "Dakshina").
- **7-Day Saptah Parayan Mode**: Grouped by the traditional 7-day reading schedule (Thursday to Wednesday) for devotees performing weekly parayan:
  - **Day 1 (Thursday)**: Chapters 1 to 9
  - **Day 2 (Friday)**: Chapters 10 to 15
  - **Day 3 (Saturday)**: Chapters 16 to 20
  - **Day 4 (Sunday)**: Chapters 21 to 26
  - **Day 5 (Monday)**: Chapters 27 to 33
  - **Day 6 (Tuesday)**: Chapters 34 to 41
  - **Day 7 (Wednesday)**: Chapters 42 to 48 (Epilogue)

### 📊 Reading Progress Tracker
- **Chapter Progress Bar**: Fixed at the bottom of the reader displaying exact page progress (e.g., *Page 3 of 8 • 38% completed*).
- **Interactive Scrubber**: Click or drag along the bottom track to scrub to any page with real-time hover previews.
- **Estimated Reading Time**: Displays estimated minutes remaining for the active chapter.
- **Total Book Progress**: Tracks book-wide completion percentage across all 48 files / 52 chapters.

### 🎨 Customizable Themes & Typography
- **4 Color Themes**:
  - **Ivory (Light)**: Clean daylight paper with charcoal ink.
  - **Sepia (Parchment)**: Warm antique paper, gentle on the eyes.
  - **Night (Dark Slate)**: Dark slate for relaxing evening and night reading.
  - **Sage (Forest)**: Calming deep emerald & sage.
- **Typography Controls**:
  - Font families: Classic Serif (*Merriweather*), Devotional Literary (*Crimson Pro*), Modern Sans (*Inter*), and Accessible (*OpenDyslexic*).
  - Adjustable font size (14px to 26px) and line height (1.4 to 2.3).
  - Traditional illuminated drop caps toggle.

### 🔍 Book-Wide Full-Text Search
- Instant, instantaneous search across all **101,000+ words** in the book.
- Groups results by chapter with surrounding text snippets and highlighted search matches.
- 1-click jump to the matching paragraph in the book!

### 🎧 Built-in Audio Reader (Text-to-Speech)
- Read chapters or pages aloud using the browser's native Web Speech API.
- Floating playback bar with Play, Pause, Stop, and Speed controls (0.8x, 1.0x, 1.2x).

### 📱 100% Offline & PWA Ready
- **PWA Enabled**: Includes `manifest.json` and `sw.js` (Service Worker) for offline reading and "Add to Home Screen" on iOS & Android.
- **Self-Contained**: All chapter text is compiled in `js/book-data.js` and `data/chapters.json`, requiring zero external databases or server runtimes.

---

## 🚀 How to Deploy to GitHub Pages

1. Push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "Add Shri Sai Satcharitra E-Reader"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select the **main** branch and folder **/(root)**, then click **Save**.
3. In 1–2 minutes, your website will be live at:
   `https://<your-username>.github.io/<your-repo-name>/`

---

## 💻 Local Preview

You can open `index.html` directly in any web browser, or serve it locally:

```bash
# Using Python
python -m http.server 8000
```
Then visit `http://localhost:8000`.

---

## 📁 Project Structure

```text
├── index.html                   # Main E-Reader Application
├── css/
│   └── reader.css               # Modern, devotional, responsive reader stylesheet
├── js/
│   ├── book-data.js             # Pre-compiled full book dataset (101,800+ words, 48 files)
│   └── reader.js                # Core pagination, bookmarking, and navigation engine
├── data/
│   └── chapters.json            # Structured JSON chapters & parayan schedule
├── assets/
│   └── images/
│       ├── favicon.svg          # Sacred Diya / Flame vector icon
│       ├── image001.jpg         # Historic portrait of author Hemadpant
│       └── hemadpant.jpg        # Author portrait
├── manifest.json                # Web App Manifest for mobile installation
├── sw.js                        # Service Worker for 100% offline reading
├── .nojekyll                    # GitHub Pages configuration bypass
└── Shri Sai Satcharitra Docs/   # Original chapter source doc files
```

---

## 🪔 Dedication

*Dedicated to the devotees of Shri Sai Baba of Shirdi. May Baba's nectar-like words and leelas bring peace, devotion, and enlightenment to all readers.*
