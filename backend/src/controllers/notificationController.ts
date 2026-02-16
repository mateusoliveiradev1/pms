import { Request, Response } from 'express';
import prisma from '../prisma';
import { sendPushToAdmins } from '../services/pushNotificationService';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.userId;
    
    // Filter notifications for this user OR global system alerts
    // Workaround: We store 'USER:{userId}' in 'type' for private notifications
    // and 'SYSTEM' for global ones.
    
    const notifications = await prisma.notification.findMany({
      where: {
          OR: [
              { type: 'SYSTEM' },
              { type: 'ALERT' }, // Assuming ALERT is global
              { type: { startsWith: `USER:${userId}` } }
          ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    // Clean up the type for frontend
    const sanitized = notifications.map(n => ({
        ...n,
        type: n.type.startsWith('USER:') ? 'PERSONAL' : n.type
    }));

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUser = (req as any).user;
  
  try {
    // Security: Check if notification belongs to user
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.json({ success: false });
    
    if (notif.type.startsWith('USER:') && !notif.type.includes(authUser.userId)) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
};

export const createNotification = async (title: string, message: string, type: string, targetUserId?: string) => {
    try {
        const finalType = targetUserId ? `USER:${targetUserId}` : type;
        
        await prisma.notification.create({
            data: { title, message, type: finalType }
        });
        
        // Send Push Notification
        // TODO: If targetUserId, fetch that user's push token specifically
        // For now, sendPushToAdmins might be too broad if it sends to everyone.
        // We should implement sendPushToUser(userId).
        // But keeping existing call for now to avoid breaking imports.
        if (!targetUserId) {
            await sendPushToAdmins(title, message, { type });
        } else {
            // Fetch user token
            const user = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (user?.expoPushToken) {
                 // Call push service (mocked here as we don't have the function exported yet)
                 // import { sendPush } from ...
            }
        }
    } catch (e) {
        console.error('Failed to create notification', e);
    }
};