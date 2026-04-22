# AAPL Market Dashboard

A password-protected web app that shows the live AAPL stock price.

## Tech Stack
- **Next.js** — web framework
- **NextAuth** — login/authentication
- **Yahoo Finance API** — live stock price (free, no key needed)
- **Vercel** — hosting

## Login Credentials
- Username: `admin`
- Password: `test123`

---

## Setup Instructions

### Step 1 — Install Node.js
Download and install from: https://nodejs.org (choose the LTS version)

### Step 2 — Push to GitHub
1. Go to github.com and create a new repository called `aapl-tracker`
2. Open Terminal (Mac) or Command Prompt (Windows)
3. Run these commands one by one:

```bash
cd path/to/aapl-tracker
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aapl-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 3 — Deploy on Vercel
1. Go to vercel.com and sign in with your GitHub account
2. Click "New Project" and import your `aapl-tracker` repository
3. Before deploying, add these Environment Variables in Vercel:
   - `NEXTAUTH_SECRET` → any random string of 32+ characters (e.g. `myrandomsecretkey1234567890abcdef`)
   - `NEXTAUTH_URL` → your Vercel URL (e.g. `https://aapl-tracker.vercel.app`)
4. Click Deploy

Your site will be live in about 1 minute!

---

## Project Structure (Backend vs Frontend)

```
pages/
  index.js              ← FRONTEND: the dashboard the user sees
  login.js              ← FRONTEND: the login page
  api/
    price.js            ← BACKEND: fetches AAPL price from Yahoo Finance
    auth/
      [...nextauth].js  ← BACKEND: handles login authentication
```
