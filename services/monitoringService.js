import { Platform } from 'react-native';
import app from '../firebaseConfig';

let analytics;
let logEventFn;
if (Platform.OS === 'web') {
  const measurementId = app.options?.measurementId;
  if (measurementId) {
    const analyticsModule = require('firebase/analytics');
    analytics = analyticsModule.getAnalytics(app);
    logEventFn = analyticsModule.logEvent;
  }
}

export const logContactMessage = ({ name, email, message }) => {
  if (!analytics) return;
  try {
    logEventFn(analytics, 'contact_message_submitted', {
      name,
      email,
      message_length: message.length,
    });
  } catch (error) {
    console.log('Failed to log contact message', error);
  }
};

export default {
  logContactMessage,
};
