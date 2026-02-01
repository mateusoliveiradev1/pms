import { Expo } from 'expo-server-sdk';
import prisma from '../prisma';

const expo = new Expo();

export const sendPushToAdmins = async (title: string, body: string, data: any = {}) => {
  try {
    // 1. Get tokens from Admins
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', expoPushToken: { not: null } }
    });

    const messages: any[] = [];
    for (const admin of admins) {
        if (!admin.expoPushToken || !Expo.isExpoPushToken(admin.expoPushToken)) continue;

        messages.push({
            to: admin.expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        });
    }

    if (messages.length === 0) return;

    // 2. Send chunks
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
            console.error('Error sending push chunk', error);
        }
    }
  } catch (error) {
    console.error('Error in sendPushToAdmins', error);
  }
};
