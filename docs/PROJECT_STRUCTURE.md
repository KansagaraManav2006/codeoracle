# CodeOracle Project Structure

CodeOracle is organized as a monorepo, containing both the React frontend and the FastAPI backend.

```text
codeoracle/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers (auth, projects, jobs)
│   │   ├── core/         # Core config, DB session, authentication dependencies
│   │   ├── models/       # SQLAlchemy ORM models (User, Project, Job)
│   │   ├── schemas/      # Pydantic validation models
│   │   ├── services/     # Business logic (AST parsing, Github ingestion, etc)
│   │   └── main.py       # FastAPI application entry point
│   ├── tests/            # Pytest test suite
│   ├── .env.example      # Backend environment template
│   └── requirements.txt  # Python dependencies
│
├── frontend/
│   ├── public/           # Static assets (favicons, etc.)
│   ├── src/
│   │   ├── assets/       # Global CSS and images
│   │   ├── components/   # React components (auth, landing, workspace)
│   │   ├── context/      # React Context (AuthContext)
│   │   ├── hooks/        # Custom React hooks (useJobPoller)
│   │   ├── App.tsx       # Main React router configuration
│   │   └── main.tsx      # React DOM entry point
│   ├── package.json      # Node.js dependencies
│   ├── tsconfig.json     # TypeScript configuration
│   └── vite.config.ts    # Vite bundler configuration
│
├── docs/                 # Project documentation
│   ├── ARCHITECTURE.md   # System design and data flow
│   ├── DEPLOYMENT.md     # Production deployment instructions
│   ├── TESTING.md        # Test coverage and strategies
│   └── PORTFOLIO_PROJECT_SUMMARY.md # Summary for portfolio
│
├── Dockerfile            # Multi-stage Docker build file
├── docker-compose.yml    # Production Compose layout
├── docker-compose.dev.yml# Development Compose layout (Hot Reload)
├── render.yaml           # Render infrastructure-as-code
└── README.md             # Main project overview
```

## Key Configuration Files
- **`Dockerfile`**: Compiles the frontend assets via Node.js and copies them into the Python environment to be served by FastAPI.
- **`render.yaml`**: Automates deployment on Render, defining the Docker web service and the managed PostgreSQL database.
- **`docker-compose.dev.yml`**: Exposes necessary ports and mounts local volumes for instant hot-reloading during development.
