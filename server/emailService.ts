import crypto from "crypto";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

export class MockEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    console.log("=".repeat(60));
    console.log("📧 [MOCK EMAIL]");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log("-".repeat(60));
    console.log(options.text || options.html.replace(/<[^>]*>/g, ""));
    console.log("=".repeat(60));
  }
}

export class EmailService {
  private provider: EmailProvider;
  private signingSecret: string;

  constructor(provider?: string) {
    const emailProvider = provider || process.env.EMAIL_PROVIDER || "mock";
    this.signingSecret = process.env.EMAIL_SIGNING_SECRET || "default-dev-secret";

    switch (emailProvider.toLowerCase()) {
      case "resend":
        throw new Error("Resend provider not yet implemented. Use 'mock' for now.");
      case "postmark":
        throw new Error("Postmark provider not yet implemented. Use 'mock' for now.");
      case "sendgrid":
        throw new Error("SendGrid provider not yet implemented. Use 'mock' for now.");
      case "mock":
      default:
        this.provider = new MockEmailProvider();
        console.log("📧 Using mock email provider");
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    return this.provider.sendEmail(options);
  }

  async sendTaskDueNotification(options: {
    email: string;
    userName: string;
    taskTitle: string;
    taskNotes: string;
    dueDate: string;
    vehicleName: string;
    taskId: string;
    userId: string;
  }): Promise<void> {
    const completeToken = this.generateActionToken(options.userId, options.taskId, "complete");
    const snoozeToken = this.generateActionToken(options.userId, options.taskId, "snooze");
    const dismissToken = this.generateActionToken(options.userId, options.taskId, "dismiss");

    const baseUrl = process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "http://localhost:5000";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .task { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #ef4444; }
          .button { display: inline-block; padding: 12px 24px; margin: 5px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
          .button-secondary { background: #6b7280; }
          .button-danger { background: #dc2626; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔧 Maintenance Task Due</h1>
          </div>
          <div class="content">
            <p>Hi ${options.userName},</p>
            <p>This is a friendly reminder that you have a maintenance task due for your <strong>${options.vehicleName}</strong>.</p>
            
            <div class="task">
              <h3>${options.taskTitle}</h3>
              <p><strong>Due Date:</strong> ${options.dueDate}</p>
              ${options.taskNotes ? `<p><strong>Notes:</strong> ${options.taskNotes}</p>` : ""}
            </div>

            <p>Quick actions:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${baseUrl}/api/maintenance/email-action/${completeToken}" class="button">Mark Complete</a>
              <a href="${baseUrl}/api/maintenance/email-action/${snoozeToken}" class="button button-secondary">Snooze 1 Week</a>
              <a href="${baseUrl}/api/maintenance/email-action/${dismissToken}" class="button button-danger">Dismiss</a>
            </div>

            <p>Or view all your tasks in the <a href="${baseUrl}">Trackday Planner</a>.</p>
          </div>
          <div class="footer">
            <p>You're receiving this because you have maintenance notifications enabled.</p>
            <p>Manage your notification preferences in Settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Maintenance Task Due

Hi ${options.userName},

This is a friendly reminder that you have a maintenance task due for your ${options.vehicleName}.

Task: ${options.taskTitle}
Due Date: ${options.dueDate}
${options.taskNotes ? `Notes: ${options.taskNotes}\n` : ""}

Quick actions:
- Mark Complete: ${baseUrl}/api/maintenance/email-action/${completeToken}
- Snooze 1 Week: ${baseUrl}/api/maintenance/email-action/${snoozeToken}
- Dismiss: ${baseUrl}/api/maintenance/email-action/${dismissToken}

Or view all your tasks in the Trackday Planner: ${baseUrl}

You're receiving this because you have maintenance notifications enabled.
Manage your notification preferences in Settings.
    `;

    await this.sendEmail({
      to: options.email,
      subject: `🔧 Maintenance Due: ${options.taskTitle}`,
      html,
      text,
    });
  }

  generateActionToken(userId: string, taskId: string, action: string): string {
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const payload = `${userId}:${taskId}:${action}:${expiry}`;
    const signature = crypto
      .createHmac("sha256", this.signingSecret)
      .update(payload)
      .digest("hex");
    
    return Buffer.from(`${payload}:${signature}`).toString("base64url");
  }

  verifyActionToken(token: string): {
    userId: string;
    taskId: string;
    action: string;
  } | null {
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      
      if (parts.length !== 5) {
        return null;
      }

      const [userId, taskId, action, expiryStr, signature] = parts;
      const expiry = parseInt(expiryStr, 10);

      if (Date.now() > expiry) {
        console.log("Token expired");
        return null;
      }

      const payload = `${userId}:${taskId}:${action}:${expiryStr}`;
      const expectedSignature = crypto
        .createHmac("sha256", this.signingSecret)
        .update(payload)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.log("Invalid signature");
        return null;
      }

      return { userId, taskId, action };
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
    }
  }
}

export const emailService = new EmailService();
