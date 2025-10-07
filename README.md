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

MVP uses Firebase Auth’s sendEmailVerification and client polling; Cloud Functions are optional and disabled on Spark.

### `emailVerifications` (top-level collection)

Each document is stored at `emailVerifications/{uid}` and mirrors a single Firebase Auth user when the backend is enabled. The client on Spark does not create or update these documents today; they remain reserved for future server-side workflows.

| Field | Type | Description |
| --- | --- | --- |
| `status` | string enum | One of `pending`, `sent`, `verified`, or `failed`. Managed by backend processes when enabled. |
| `createdAt` | timestamp | Server timestamp captured when the document is first created. |
| `updatedAt` | timestamp | Last server-side update time. |
| `tokenHash` | string or null | Hash of the email verification token managed by backend jobs. |
| `lastError` | map or null | Optional error metadata with keys `code`, `message`, and `at` (a timestamp) recorded by backend processes when email delivery fails. |

> **Note:** When the Cloud Functions backend is enabled, all mutations (status transitions, timestamps, token hashing, error recording) must be performed by trusted server code using the Admin SDK or a service account with the `admin` custom claim. Corresponding Firestore security rules enforce this separation of responsibilities.

## Manual email verification validation

On Spark the client relies on Firebase Auth’s `sendEmailVerification` and local polling. To manually validate the experience:

1. Start the emulators from the `functions` directory with `npm run serve` (or run against Firebase Auth in a staging project) and authenticate with a test user that has an email address.
2. **Happy path:**
   - Ensure outbound email is configured for the environment.
   - Trigger account creation in the app and confirm that a verification email arrives for the test user.
   - From the verification screen, poll for `auth.currentUser.emailVerified` until it becomes `true`, then continue the flow.
3. **Delivery failure path:**
   - Temporarily misconfigure email delivery (for example by using an invalid SMTP or SendGrid credential).
   - Trigger account creation again and confirm the user receives the in-app warning about verification email delivery issues.
   - Restore valid mail settings after completing the checks.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
