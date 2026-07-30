# Repository Structure

```text
Best-Check-In/
├── docs/                 # Official documentation (this tree)
├── src/                  # React application
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── context/
│   ├── types/
│   ├── i18n/
│   └── utils/
├── netlify/
│   └── functions/        # Serverless API
├── public/               # Static assets
├── package.json
├── netlify.toml
└── README.md
```

**Rule:** Application behaviour changes go in `src/` or `netlify/functions/`. Product truth goes in `docs/`.
