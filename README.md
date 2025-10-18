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

## Deploy Firebase Storage rules

Publish the storage rules (including `storage.rules`) to Firebase Storage with the Firebase CLI:

```bash
firebase deploy --only storage
```

The command uploads the rules defined in `firebase.json` to the default Firebase project configured for this repository. Ensure you are authenticated with the Firebase CLI (`firebase login`) and have selected the correct project (`firebase use <project-id>`) before deploying.

## Deploy Firestore indexes

After updating composite queries, deploy the Firestore indexes declared in `firestore.indexes.json`:

```bash
firebase firestore:indexes
```

This creates the composite index on `games` required by the listener query (`players` array membership ordered by `updatedAt` descending) and prevents missing index prompts in the Firestore console once deployment completes.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
