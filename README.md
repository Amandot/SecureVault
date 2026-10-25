# SecureVault

SecureVault is a zero-knowledge, client-side encrypted document management system. The platform consists of a Next.js web application, a React Native mobile application, and an Express.js backend.

## Project Structure

```text
SecureVault
├── frontend      # Web Application (Next.js 15)
├── mobile        # Mobile Application (React Native + Expo)
└── backend       # Backend Server (Express + Prisma)
```

## Security Architecture

SecureVault employs a hybrid encryption model ensuring zero-knowledge security:
1. **Symmetric Encryption (AES-256-GCM)**: Each file is encrypted with a unique, randomly generated AES key before upload.
2. **Asymmetric Encryption (RSA-4096-OAEP)**: The file's AES key is wrapped (encrypted) with the owner's RSA public key.
3. **Local Key Protection (AES-GCM)**: The user's RSA private key is never uploaded. It is encrypted locally using an AES key derived from a Master Passphrase (PBKDF2) and stored in local platform storage (localStorage on web, SecureStore on mobile).

**Interoperability**: The web and mobile applications use identical cryptographic formats (AES-GCM with 16-byte authentication tags appended). Files encrypted on the web can be seamlessly decrypted on the mobile application and vice versa.

## Mobile Application

The mobile application is built using React Native, Expo, and Expo Router. It provides a native experience while sharing the existing Express backend and Firebase Authentication project with the web app.

### Mobile Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env.local` and populate the fields. For local development, set the API URL to your machine's local IP address (e.g., `192.168.1.5`), not `localhost`, so that physical devices and emulators can reach the backend:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.5:4000
   ```

4. Run the application:
   ```bash
   npx expo start
   ```

- **iOS Testing**: Press `i` to open in iOS Simulator (requires macOS and Xcode).
- **Android Testing**: Press `a` to open in Android Emulator (requires Android Studio).
- **Physical Device**: Scan the QR code with the Expo Go app.

### Production Build

For production builds, configure your `app.json` with appropriate bundle identifiers and use EAS Build:
```bash
npx expo prebuild
npx expo build:android
npx expo build:ios
```

## Backend API Integrations

The mobile application communicates with the existing backend without modifications. Firebase tokens are passed as Bearer tokens in the `Authorization` header, leveraging the same middleware used by the web application.
