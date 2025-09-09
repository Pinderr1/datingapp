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

- `EXPO_PUBLIC_API_URL` – base URL for the backend API.
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

## API

### POST `/contact`

Send a contact message to the server.

**Request body**

```json
{
  "name": "Your Name",
  "email": "you@example.com",
  "message": "Hello!"
}
```

**Response**

```
200 OK
{ "success": true }
```

The server stores messages in Firestore.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
