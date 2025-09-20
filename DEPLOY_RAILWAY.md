# Deploying Career Mirror Backend to Railway

This guide helps you deploy the Node/Express backend to Railway using your GitHub repository.

Included in this repo
- railway.toml (Nixpacks build with npm start and /health healthcheck)
- Dockerfile (optional Docker-based deploy)
- .dockerignore (keeps build context lean; excludes env files and artifacts)
- .env.example (safe template; do NOT commit your real .env)

Prerequisites
- A GitHub repository containing this project
- PostgreSQL (e.g., Neon) connection string (DATABASE_URL)
- SESSION_SECRET (a long random string)
- OPENAI_API_KEY

Option A — Deploy via Nixpacks (recommended)
1) Connect repo in Railway
   - Railway dashboard -> New Project -> Deploy from GitHub -> select your repo

2) Configure environment variables in Railway (Project -> Variables)
   - DATABASE_URL
   - SESSION_SECRET
   - OPENAI_API_KEY
   - NODE_ENV=production
   - ENABLE_LOCAL_AUTH=true (recommended for quick demo auth without external OIDC)
   - PORT (Railway sets this automatically; app reads it)

3) Deploy
   - Railway will build with Nixpacks and run startCommand from railway.toml (npm start)
   - Healthcheck: GET /health

Option B — Deploy via Dockerfile
1) When creating the service, choose Docker and let Railway build with the provided Dockerfile
2) Set the same environment variables as above
3) Deploy; the image exposes port 5000 and runs node dist/index.js

Verifying your deployment
- Open the service URL in Railway or run:
```bash path=null start=null
curl -s https://<your-railway-url>/health
```
You should see a JSON response with status: "OK".

Running database migrations on Railway
If you update the Drizzle schema, run migrations from the Railway shell:
```bash path=null start=null
# Open a shell in the service and run:
npm run db:push     # or: npm run db:migrate
```
Ensure DATABASE_URL is set in Railway variables.

Local production test (optional)
```bash path=null start=null
npm install
npm run build
node dist/index.js
# In another terminal:
curl -s http://localhost:5000/health
```

Auth modes
- Quick demo (no external OIDC): set ENABLE_LOCAL_AUTH=true (already used in .env.example). A mock user is injected server-side.
- Replit OIDC (advanced): set REPLIT_DOMAINS, REPL_ID, and optionally ISSUER_URL, and remove ENABLE_LOCAL_AUTH=true.

Security notes
- Do not commit .env. Set secrets in Railway variables.
- Regenerate SESSION_SECRET if you suspect exposure.

Troubleshooting
- Build fails: check Railway build logs; ensure Node >= 20 (set in package.json engines)
- 500 errors: inspect Railway service logs; verify DATABASE_URL and OPENAI_API_KEY
- Unauthorized errors during API calls: when using demo auth, ensure ENABLE_LOCAL_AUTH=true in Railway variables
