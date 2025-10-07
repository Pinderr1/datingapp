jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

const mockAuthListeners = new Set();
const mockAuth = { currentUser: null };

mockAuth.triggerAuthStateChange = (user = mockAuth.currentUser) => {
  mockAuth.currentUser = user;
  mockAuthListeners.forEach((listener) => listener(mockAuth.currentUser));
};

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  initializeAuth: jest.fn(() => mockAuth),
  getReactNativePersistence: jest.fn(),
  onAuthStateChanged: jest.fn((auth, cb) => {
    mockAuthListeners.add(cb);
    setTimeout(() => {
      if (mockAuthListeners.has(cb)) {
        cb(auth.currentUser);
      }
    }, 0);
    return () => {
      mockAuthListeners.delete(cb);
    };
  }),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(async () => ({
    exists: () => false,
    data: () => null,
  })),
  setDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => async () => ({
    data: { users: [], nextCursor: null },
  })),
}));

jest.mock('expo', () => ({}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: ({ children }) => children,
  useRouter: () => mockRouter,
  useNavigation: () => ({
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
  }),
  router: mockRouter,
}));

jest.mock('react-tinder-card', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
