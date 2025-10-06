# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm (comes with Node.js)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Environment Setup

Copy the example environment file and configure the values:

```bash
cp .env.example .env
```

Required variables:
- `EXPO_PUBLIC_CONTACT_EMAIL` – default email address for the contact form.
- Cloud Functions App Check enforcement can be toggled with `functions.config().security.enforce_app_check`.

### Install dependencies

```bash
npm install
```

### Dry Build

Verify the project compiles without running the app:

```bash
npm run build
```

### Start the app

```bash
npx expo start
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Fix deps

If the dependency tree drifts from the Expo SDK 54 expectations, run the following commands to reinstall everything and verify the project:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo-doctor
npm run lint
npm run build
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Firestore data model

### `emailVerifications` (top-level collection)

Each document is stored at `emailVerifications/{uid}` and mirrors a single Firebase Auth user. New users get a document in `pending` status during registration.

| Field | Type | Description |
| --- | --- | --- |
| `status` | string enum | One of `pending`, `sent`, `verified`, or `failed`. Client writes are limited to the initial `pending` state. |
| `createdAt` | timestamp | Server timestamp captured when the document is first created. |
| `updatedAt` | timestamp | Last server-side update time. |
| `tokenHash` | string or null | Hash of the email verification token managed by backend jobs. |
| `lastError` | map or null | Optional error metadata with keys `code`, `message`, and `at` (a timestamp) recorded by backend processes when email delivery fails. |

> **Note:** Aside from the initial `pending` document created by the client, all subsequent mutations (status transitions, timestamps, token hashing, error recording) must be performed by trusted server code using the Admin SDK or a service account with the `admin` custom claim. Corresponding Firestore security rules enforce this separation of responsibilities.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
