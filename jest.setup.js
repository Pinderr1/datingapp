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

const buildRef = (segments) => ({
  id: segments[segments.length - 1] ?? null,
  path: segments.join('/'),
  _segments: segments,
});

const mockCollection = jest.fn((_, ...segments) => buildRef(segments));
const mockDoc = jest.fn((base, ...segments) => {
  const pathSegments = Array.isArray(base?._segments) ? [...base._segments] : [];
  if (segments.length === 0 && typeof base === 'string') {
    return buildRef([base]);
  }
  if (segments.length === 0 && pathSegments.length === 0 && Array.isArray(base)) {
    return buildRef(base);
  }
  if (segments.length === 0 && pathSegments.length === 0) {
    return buildRef([]);
  }
  pathSegments.push(...segments);
  return buildRef(pathSegments);
});

const mockGetDoc = jest.fn(async () => ({
  exists: () => false,
  data: () => null,
}));

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockServerTimestamp = jest.fn(() => ({ __firestoreServerTimestamp: true }));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: mockServerTimestamp,
}));

global.__firestoreMocks = {
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: mockServerTimestamp,
};

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

const runFocusEffect = (effect) => {
  if (typeof effect !== 'function') {
    return () => {};
  }
  const cleanup = effect();
  return typeof cleanup === 'function' ? cleanup : () => {};
};

jest.mock('expo-router', () => ({
  Stack: ({ children }) => children,
  useRouter: () => mockRouter,
  useFocusEffect: (effect) => runFocusEffect(effect),
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

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));
