# Crocs and Clicks - Setup Instructions

## Files to Add to Your Project

Copy the following files into your Next.js project:

```
your-project/
├── .env.local                    # Environment variables (DON'T commit this!)
├── middleware.ts                 # Auth middleware (root level)
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser client
│       └── server.ts             # Server client
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── login/
│   │   └── page.tsx              # Login page
│   └── dashboard/
│       └── page.tsx              # Dashboard with 3 pipelines
└── components/
    └── logout-button.tsx         # Logout button component
```

## Step 1: Install Dependencies

Run this in your project folder:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Step 2: Copy Files

Copy all the files from this package into your project, maintaining the folder structure.

## Step 3: Set Up Google OAuth in Supabase

1. Go to https://lwratkmmlcuwhjrofocf.supabase.co
2. Navigate to **Authentication → Providers → Google**
3. Enable Google provider
4. You'll need to create Google OAuth credentials:

### Create Google OAuth Credentials:

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Select **Web application**
6. Add these authorized redirect URIs:
   - `https://lwratkmmlcuwhjrofocf.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
7. Copy the **Client ID** and **Client Secret**
8. Paste them in Supabase Google provider settings

## Step 4: Add Environment Variables to Vercel

Go to your Vercel project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://lwratkmmlcuwhjrofocf.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key)

## Step 5: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000/login to test Google sign-in.

## What's Included

- ✅ Supabase client setup (browser + server)
- ✅ Auth middleware (protects /dashboard routes)
- ✅ Google OAuth login page
- ✅ OAuth callback handler
- ✅ Dashboard with 3 pipeline cards (Website, SEO, Ads)
- ✅ Logout functionality

## Next Steps

After this is working:
1. Build the Website Pipeline wizard
2. Set up the database schema for businesses, keywords, etc.
3. Add Stripe for billing

---

**Security Note:** The `.env.local` file contains your Supabase credentials. 
Make sure it's in your `.gitignore` (it should be by default in Next.js projects).
