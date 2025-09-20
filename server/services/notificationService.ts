import { db } from '../db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { notifications, users, type Notification, type InsertNotification } from '@shared/schema';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface SMSTemplate {
  message: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  types: {
    course_deadline: boolean;
    achievement_unlocked: boolean;
    connection_request: boolean;
    mentorship_request: boolean;
    forum_reply: boolean;
    study_group_invite: boolean;
    career_milestone: boolean;
    skill_gap_update: boolean;
  };
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: twilio.Twilio | null = null;
  private readonly FROM_EMAIL: string;
  private readonly FROM_PHONE: string;

  constructor() {
    this.FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@careermirror.com';
    this.FROM_PHONE = process.env.TWILIO_PHONE_NUMBER || '';

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize Twilio if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      console.warn('Twilio credentials not found. SMS notifications will be disabled.');
    }
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    channels: Array<'email' | 'sms' | 'push' | 'in_app'> = ['in_app']
  ): Promise<Notification> {
    // Create in-app notification
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        status: 'unread'
      })
      .returning();

    // Get user data and preferences
    const user = await this.getUserWithPreferences(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Send via requested channels
    const promises = channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            if (this.shouldSendEmail(type, user.preferences)) {
              await this.sendEmail(user.email, type, title, message, metadata);
            }
            break;
          case 'sms':
            if (this.shouldSendSMS(type, user.preferences) && user.phone) {
              await this.sendSMS(user.phone, type, message);
            }
            break;
          case 'push':
            // TODO: Implement push notifications
            break;
          case 'in_app':
            // Already created above
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    });

    await Promise.allSettled(promises);
    return notification;
  }

  /**
   * Send course deadline reminder
   */
  async sendCourseDeadlineReminder(
    userId: string,
    courseTitle: string,
    deadlineDate: Date,
    daysUntilDeadline: number
  ): Promise<void> {
    const title = `Course Deadline Reminder: ${courseTitle}`;
    const message = `Your course "${courseTitle}" is due in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''}. Complete it by ${deadlineDate.toLocaleDateString()}.`;

    await this.sendNotification(
      userId,
      'course_deadline',
      title,
      message,
      {
        courseTitle,
        deadlineDate: deadlineDate.toISOString(),
        daysUntilDeadline
      },
      ['email', 'sms', 'in_app']
    );
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(
    userId: string,
    achievementName: string,
    points: number,
    description: string
  ): Promise<void> {
    const title = `🏆 Achievement Unlocked: ${achievementName}`;
    const message = `Congratulations! You've earned "${achievementName}" and gained ${points} XP. ${description}`;

    await this.sendNotification(
      userId,
      'achievement_unlocked',
      title,
      message,
      {
        achievementName,
        points,
        description
      },
      ['email', 'push', 'in_app']
    );
  }

  /**
   * Send connection request notification
   */
  async sendConnectionRequestNotification(
    recipientId: string,
    requesterName: string,
    message?: string
  ): Promise<void> {
    const title = `New Connection Request from ${requesterName}`;
    const notificationMessage = message 
      ? `${requesterName} wants to connect with you: "${message}"`
      : `${requesterName} wants to connect with you.`;

    await this.sendNotification(
      recipientId,
      'connection_request',
      title,
      notificationMessage,
      {
        requesterName,
        requestMessage: message
      },
      ['email', 'push', 'in_app']
    );
  }

  /**
   * Send mentorship request notification
   */
  async sendMentorshipRequestNotification(
    mentorId: string,
    menteeName: string,
    requestMessage: string,
    goals?: string
  ): Promise<void> {
    const title = `Mentorship Request from ${menteeName}`;
    const message = `${menteeName} has requested you as a mentor. Message: "${requestMessage}"${goals ? ` Goals: ${goals}` : ''}`;

    await this.sendNotification(
      mentorId,
      'mentorship_request',
      title,
      message,
      {
        menteeName,
        requestMessage,
        goals
      },
      ['email', 'sms', 'in_app']
    );
  }

  /**
   * Send career milestone notification
   */
  async sendCareerMilestoneNotification(
    userId: string,
    milestoneName: string,
    description: string
  ): Promise<void> {
    const title = `🎯 Career Milestone Reached: ${milestoneName}`;
    const message = `Great progress! You've reached "${milestoneName}". ${description}`;

    await this.sendNotification(
      userId,
      'career_milestone',
      title,
      message,
      {
        milestoneName,
        description
      },
      ['email', 'push', 'in_app']
    );
  }

  /**
   * Send skill gap update notification
   */
  async sendSkillGapUpdateNotification(
    userId: string,
    targetRole: string,
    improvementsFound: string[]
  ): Promise<void> {
    const title = `New Skills Identified for ${targetRole}`;
    const message = `We've updated your skill gap analysis for ${targetRole}. New areas for improvement: ${improvementsFound.join(', ')}.`;

    await this.sendNotification(
      userId,
      'skill_gap_update',
      title,
      message,
      {
        targetRole,
        improvementsFound
      },
      ['email', 'in_app']
    );
  }

  /**
   * Send study group invitation
   */
  async sendStudyGroupInvitation(
    userId: string,
    groupName: string,
    inviterName: string,
    subject: string
  ): Promise<void> {
    const title = `Study Group Invitation: ${groupName}`;
    const message = `${inviterName} has invited you to join the "${groupName}" study group focused on ${subject}.`;

    await this.sendNotification(
      userId,
      'study_group_invite',
      title,
      message,
      {
        groupName,
        inviterName,
        subject
      },
      ['email', 'push', 'in_app']
    );
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      title,
      message,
      metadata: metadata || {},
      status: 'unread' as const
    }));

    await db.insert(notifications).values(notifications);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    status?: 'read' | 'unread',
    limit = 50
  ): Promise<Notification[]> {
    let whereCondition = eq(notifications.userId, userId);

    if (status) {
      whereCondition = and(whereCondition, eq(notifications.status, status));
    }

    return await db
      .select()
      .from(notifications)
      .where(whereCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    await db
      .update(notifications)
      .set({
        status: 'read',
        readAt: new Date()
      })
      .where(inArray(notifications.id, notificationIds));
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: db.count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.status, 'unread')
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Schedule recurring notifications (cron job helper)
   */
  async scheduleRecurringNotifications(): Promise<void> {
    try {
      // Course deadline reminders (run daily)
      await this.sendCourseDeadlineReminders();
      
      // Weekly progress summaries
      await this.sendWeeklyProgressSummaries();
      
      // Monthly achievement recaps
      await this.sendMonthlyAchievementRecaps();
      
    } catch (error) {
      console.error('Error in scheduled notifications:', error);
    }
  }

  // Private helper methods
  private async sendEmail(
    to: string,
    type: string,
    subject: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const template = this.getEmailTemplate(type, subject, message, metadata);
    
    const mailOptions = {
      from: this.FROM_EMAIL,
      to,
      subject: template.subject,
      text: template.textContent,
      html: template.htmlContent
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  private async sendSMS(
    to: string,
    type: string,
    message: string
  ): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const template = this.getSMSTemplate(type, message);
    
    await this.twilioClient.messages.create({
      body: template.message,
      from: this.FROM_PHONE,
      to
    });
  }

  private getEmailTemplate(
    type: string,
    subject: string,
    message: string,
    metadata?: Record<string, any>
  ): EmailTemplate {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; }
            .footer { background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Career Mirror</h1>
              <h2>${subject}</h2>
            </div>
            <div class="content">
              <p>${message.replace(/\n/g, '</p><p>')}</p>
              ${this.getTypeSpecificContent(type, metadata)}
            </div>
            <div class="footer">
              <p>Career Mirror - Your AI-Powered Career Guidance Platform</p>
              <p><a href="#" style="color: #667eea;">Unsubscribe</a> | <a href="#" style="color: #667eea;">Update Preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return {
      subject,
      htmlContent: baseTemplate,
      textContent: `${subject}\n\n${message}\n\nCareer Mirror - Your AI-Powered Career Guidance Platform`
    };
  }

  private getSMSTemplate(type: string, message: string): SMSTemplate {
    const shortMessage = message.length > 140 ? `${message.substring(0, 137)}...` : message;
    return {
      message: `Career Mirror: ${shortMessage}`
    };
  }

  private getTypeSpecificContent(type: string, metadata?: Record<string, any>): string {
    switch (type) {
      case 'course_deadline':
        return metadata?.deadlineDate 
          ? `<p><strong>Deadline:</strong> ${new Date(metadata.deadlineDate).toLocaleDateString()}</p>`
          : '';
      
      case 'achievement_unlocked':
        return metadata?.points 
          ? `<p><strong>XP Earned:</strong> ${metadata.points} points</p>`
          : '';
      
      default:
        return '';
    }
  }

  private async getUserWithPreferences(userId: string): Promise<{
    email: string;
    phone?: string;
    preferences: NotificationPreferences;
  } | null> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) return null;

    // TODO: Get actual user preferences from database
    // For now, return default preferences
    return {
      email: user[0].email,
      phone: undefined, // TODO: Add phone field to user schema
      preferences: {
        email: true,
        sms: true,
        push: true,
        types: {
          course_deadline: true,
          achievement_unlocked: true,
          connection_request: true,
          mentorship_request: true,
          forum_reply: true,
          study_group_invite: true,
          career_milestone: true,
          skill_gap_update: true
        }
      }
    };
  }

  private shouldSendEmail(type: string, preferences: NotificationPreferences): boolean {
    return preferences.email && (preferences.types as any)[type] !== false;
  }

  private shouldSendSMS(type: string, preferences: NotificationPreferences): boolean {
    return preferences.sms && (preferences.types as any)[type] !== false;
  }

  private async sendCourseDeadlineReminders(): Promise<void> {
    // TODO: Implement course deadline checking logic
    console.log('Checking for course deadlines...');
  }

  private async sendWeeklyProgressSummaries(): Promise<void> {
    // TODO: Implement weekly progress summary logic
    console.log('Sending weekly progress summaries...');
  }

  private async sendMonthlyAchievementRecaps(): Promise<void> {
    // TODO: Implement monthly achievement recap logic
    console.log('Sending monthly achievement recaps...');
  }
}

export const notificationService = new NotificationService();