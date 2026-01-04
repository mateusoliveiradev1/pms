import { Request, Response } from 'express';
import prisma from '../prisma';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
};

export const createNotification = async (title: string, message: string, type: string) => {
    try {
        await prisma.notification.create({
            data: { title, message, type }
        });
    } catch (e) {
        console.error('Failed to create notification', e);
    }
};