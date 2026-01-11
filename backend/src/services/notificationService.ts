import axios from 'axios';

// Interface for Notification Strategy
export interface NotificationChannel {
  send(title: string, message: string, data?: any): Promise<void>;
  name: string;
}

// Slack Channel
export class SlackChannel implements NotificationChannel {
  name = 'slack';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(title: string, message: string, data?: any): Promise<void> {
    if (!this.webhookUrl) return;
    try {
      await axios.post(this.webhookUrl, {
        text: `*${title}*\n${message}`,
        attachments: data ? [{ text: JSON.stringify(data, null, 2) }] : undefined
      });
    } catch (error) {
      console.error(`Failed to send to Slack:`, error);
    }
  }
}

// Discord Channel
export class DiscordChannel implements NotificationChannel {
  name = 'discord';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(title: string, message: string, data?: any): Promise<void> {
    if (!this.webhookUrl) return;
    try {
      await axios.post(this.webhookUrl, {
        content: `**${title}**\n${message}`,
        embeds: data ? [{ description: JSON.stringify(data, null, 2) }] : undefined
      });
    } catch (error) {
      console.error(`Failed to send to Discord:`, error);
    }
  }
}

// Email Channel (Mock for now)
export class EmailChannel implements NotificationChannel {
  name = 'email';
  
  async send(title: string, message: string, data?: any): Promise<void> {
    // In a real app, integrate with SendGrid/AWS SES
    console.log(`[EMAIL ALERT] ${title}: ${message}`, data ? JSON.stringify(data) : '');
  }
}

// Notification Service (Context)
export class NotificationService {
  private channels: NotificationChannel[] = [];
  private static instance: NotificationService;

  private constructor() {
    // Initialize channels based on ENV
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.push(new SlackChannel(process.env.SLACK_WEBHOOK_URL));
    }
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.channels.push(new DiscordChannel(process.env.DISCORD_WEBHOOK_URL));
    }
    // Always add Email (Mock)
    this.channels.push(new EmailChannel());
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
        NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async notify(title: string, message: string, data?: any) {
    const promises = this.channels.map(channel => channel.send(title, message, data));
    await Promise.allSettled(promises);
  }
}

export const notificationService = NotificationService.getInstance();
