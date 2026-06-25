# 🔐 SecureVault

> Military-grade, end-to-end encrypted document management system. Inspired by Google Drive + Proton Drive + Tresorit.

![SecureVault](https://img.shields.io/badge/Encryption-AES--256--GCM-00C8FF?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.16-2D3748?style=for-the-badge&logo=prisma)

## 🏗️ Architecture

```
securevault/
├── frontend/          ← Next.js 15 (App Router) + TypeScript
└── backend/           ← Express.js + Prisma + PostgreSQL
```

### Zero-Knowledge Design

```
Your File (browser)
  ↓  AES-256-GCM encrypt (Web Crypto API)
  ↓  [Optional] ChaCha20-Poly1305 layer
  ↓  [Optional] XChaCha20 layer
  ↓  RSA-4096-OAEP key wrap
  ↓  POST encrypted blob to Backend → Supabase Storage
     (only encrypted ciphertext stored)
     (server NEVER sees plaintext or keys)
```

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **State** | TanStack Query |
| **Crypto** | Web Crypto API + @noble/ciphers |
| **Auth** | Firebase Authentication |
| **Backend** | Express.js, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Storage** | Supabase Storage |
| **Security** | Helmet, CORS, Rate Limiting |

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted)
- Firebase project
- Supabase project

## ⚙️ Setup

### 1. Clone & Install

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

### 2. Configure Environment

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/securevault
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CORS_ORIGIN=http://localhost:3000
PORT=4000
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Go to Project Settings → Service Accounts → Generate new private key
5. Copy the values into `backend/.env`
6. Copy the web app config into `frontend/.env.local`

### 4. Supabase Setup

1. Create a [Supabase project](https://database.new)
2. Go to Project Settings → API to get your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
3. Go to Storage and create a new bucket named `encrypted-files`
4. Make sure the bucket is **Private** (do not allow public access)
5. Copy the values to your `backend/.env` and `frontend/.env.local`

### 5. Database Setup

```bash
cd backend

# Create the database
createdb securevault

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 6. Run Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:3000
```

## 🔐 Encryption Architecture

### Client-Side Encryption (Browser)

1. **Layer 1 — AES-256-GCM** (always): `Web Crypto API`
   - Random 256-bit key generated per file
   - Random 96-bit IV

2. **Layer 2 — ChaCha20-Poly1305** (optional): `@noble/ciphers`
   - Applied before AES layer
   - User-provided passphrase

3. **Layer 3 — XChaCha20-Poly1305** (optional): `@noble/ciphers`
   - Extended 192-bit nonce
   - User-provided passphrase

4. **RSA-4096-OAEP Key Wrapping**:
   - AES key wrapped with owner's public key
   - Private key encrypted with user's master passphrase
   - Stored in localStorage — never sent to server

### Server-Side (Zero-Knowledge)

- Stores only: encrypted ciphertext, encrypted AES key, IV, metadata
- Never sees: plaintext, raw AES key, passphrases

## 📡 API Endpoints

```
POST   /api/auth/register          Register user + store public key
GET    /api/auth/me                Get current user profile
POST   /api/auth/public-key        Update RSA public key
GET    /api/auth/user/:email       Look up user's public key

GET    /api/files                  List owned files
POST   /api/files/upload           Upload encrypted file to backend + create metadata
GET    /api/files/:id              Get file + Supabase signed download URL
PATCH  /api/files/:id              Rename / update settings
DELETE /api/files/:id              Soft/hard delete
GET    /api/files/trash/list       List deleted files

POST   /api/share                  Create share link
GET    /api/share/:token           Resolve share token
GET    /api/share                  List owned shares
DELETE /api/share/:id              Revoke share
GET    /api/share/with/me          Files shared with me

GET    /api/folders                List folders
POST   /api/folders                Create folder
PATCH  /api/folders/:id            Rename folder
DELETE /api/folders/:id            Delete folder

GET    /api/activity               Activity timeline
GET    /api/notifications          Notifications
PATCH  /api/notifications/read-all Mark all read
```

## 🎨 UI Features

- **Dark glassmorphism theme** (`#07111F` base, `#00C8FF` accent)
- **Framer Motion** page transitions, sidebar animations, card hover effects
- **Drag & drop upload** with glow animation
- **Multi-layer encryption configurator** with passphrase strength meter
- **Grid/list file view toggle**
- **Real-time notification dropdown**
- **Collapsible sidebar** with icon-only mode
- **Skeleton loading** states
- **Split-screen auth pages**

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx                   # Landing page
│   ├── layout.tsx                 # Root layout
│   ├── providers.tsx              # QueryClient + Auth providers
│   ├── login/page.tsx             # Split-screen login
│   ├── register/page.tsx          # Registration
│   └── dashboard/
│       ├── layout.tsx             # Dashboard layout (sidebar + navbar)
│       ├── page.tsx               # Dashboard home
│       ├── upload/page.tsx        # Secure upload
│       ├── my-files/page.tsx      # File manager
│       ├── shared/page.tsx        # Shared with me
│       ├── activity/page.tsx      # Activity timeline
│       ├── settings/page.tsx      # Settings
│       ├── recent/page.tsx        # Recent files
│       ├── trash/page.tsx         # Deleted files
│       ├── favorites/page.tsx     # Starred files
│       └── requests/page.tsx      # Access requests
├── components/
│   ├── auth/AuthGuard.tsx         # Route protection
│   ├── layout/Sidebar.tsx         # Animated sidebar
│   ├── layout/Navbar.tsx          # Top navbar + notifications
│   └── modals/ShareModal.tsx      # Share file modal
└── lib/
    ├── firebase/                   # Firebase setup
    ├── auth/AuthContext.tsx        # Auth state + hooks
    ├── crypto/
    │   ├── aes.ts                  # AES-256-GCM
    │   ├── chacha.ts               # ChaCha20 + XChaCha20
    │   ├── keyManager.ts           # RSA key pair management
    │   └── fileEncryptor.ts        # High-level encrypt/decrypt
    └── api.ts                      # Axios API client

backend/
├── src/
│   ├── index.ts                   # Express server
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── files.ts
│   │   ├── share.ts
│   │   ├── activity.ts
│   │   ├── folders.ts
│   │   └── notifications.ts
│   ├── middleware/
│   │   ├── firebaseAuth.ts        # JWT verification
│   │   └── errorHandler.ts
│   ├── services/
│   │   └── storage.ts             # Supabase storage
│   └── lib/
│       ├── prisma.ts
│       └── firebase.ts
└── prisma/
    └── schema.prisma              # Database schema
```

## 🛡️ Security Checklist

- [x] Client-side AES-256-GCM encryption
- [x] Optional ChaCha20-Poly1305 + XChaCha20 layers
- [x] RSA-4096 key wrapping
- [x] Firebase JWT verification on all endpoints
- [x] Rate limiting (200 req/15min global, 20 req/15min auth)
- [x] Helmet.js security headers
- [x] CORS configured
- [x] Zod input validation
- [x] Supabase signed URLs (no public access)
- [x] Soft delete (files recoverable from trash)
- [x] Activity logging for audit trail
- [x] Share expiry, view limits, IP restrictions

## 📄 License

MIT © SecureVault
