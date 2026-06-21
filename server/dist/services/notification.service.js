"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
let app;
// Initialize firebase admin with env variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const existingApps = (0, app_1.getApps)();
        if (existingApps.length === 0) {
            app = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount)
            });
            console.log('[NotificationService] Firebase Admin initialized');
        }
        else {
            app = existingApps[0];
        }
    }
    catch (e) {
        console.error('[NotificationService] Failed to initialize Firebase Admin:', e);
    }
}
/**
 * Sends a push notification to a specific user device.
 * Used for new messages and incoming calls.
 */
async function sendPushNotification(token, title, body, data = {}) {
    const activeApp = app || ((0, app_1.getApps)().length > 0 ? (0, app_1.getApps)()[0] : undefined);
    if (!activeApp) {
        console.warn('[NotificationService] Firebase Admin not initialized. Skipping push.');
        return;
    }
    const message = {
        notification: { title, body },
        data: {
            ...data,
            type: data.type || 'message',
            tag: data.tag || (data.type === 'call' ? 'incoming-call' : 'new-message')
        },
        token: token,
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: data.type === 'call' ? 'calls' : 'messages',
                tag: data.tag || (data.type === 'call' ? 'incoming-call' : 'new-message')
            }
        },
        apns: {
            payload: {
                aps: {
                    contentAvailable: true,
                    sound: 'default',
                    category: data.type === 'call' ? 'INCOMING_CALL' : undefined
                }
            }
        },
        webpush: {
            headers: {
                Urgency: 'high'
            },
            notification: {
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: data.tag || (data.type === 'call' ? 'incoming-call' : 'new-message'),
                renotify: true,
                requireInteraction: data.type === 'call'
            }
        }
    };
    try {
        const messaging = (0, messaging_1.getMessaging)(activeApp);
        const response = await messaging.send(message);
        return response;
    }
    catch (error) {
        if (error.code === 'messaging/registration-token-not-registered') {
            console.warn('[NotificationService] Token is no longer valid');
            return 'EXPIRED_TOKEN';
        }
        console.error('[NotificationService] Error sending push notification:', error);
    }
}
