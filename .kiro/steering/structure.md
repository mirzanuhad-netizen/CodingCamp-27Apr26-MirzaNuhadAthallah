# Project Structure

```
/
├── index.html          # Entry point
├── css/
│   └── style.css       # Single stylesheet (all styles here)
├── js/
│   └── app.js          # Single JS file (all logic here)
├── .kiro/
│   └── steering/       # AI assistant steering docs
└── README.md
```

## Conventions

- Only 1 CSS file inside `css/`
- Only 1 JavaScript file inside `js/`
- No build step — static files only
- No committing secrets or `.env` files
- All data stored in `localStorage` (no backend)
