import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/config';
import { EmailPayload } from '../types/index';

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    try {
      if (!config.email.enabled) {
        console.log('📧 Email service is disabled');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPassword,
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.transporter) {
        console.warn('⚠️ Email service not configured');
        return false;
      }

      const info = await this.transporter.sendMail({
        from: config.email.smtpUser,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      console.log(`✅ Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send job found notification
   */
  async sendJobFoundNotification(
    email: string,
    jobTitle: string,
    company: string,
    jobUrl: string,
    source: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">🎉 New Job Match Found!</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #27ae60; margin: 0 0 10px 0;">${jobTitle}</h3>
          <p style="margin: 5px 0;"><strong>Company:</strong> ${company}</p>
          <p style="margin: 5px 0;"><strong>Source:</strong> ${source}</p>
        </div>

        <div style="margin: 20px 0;">
          <a href="${jobUrl}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Job
          </a>
        </div>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your AI Job Agent.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `🎉 New Job Match: ${jobTitle} at ${company}`,
      html,
    });
  }

  /**
   * Send application submitted notification
   */
  async sendApplicationSubmittedNotification(
    email: string,
    jobTitle: string,
    company: string,
    source: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📤 Application Submitted!</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #3498db; margin: 0 0 10px 0;">${jobTitle}</h3>
          <p style="margin: 5px 0;"><strong>Company:</strong> ${company}</p>
          <p style="margin: 5px 0;"><strong>Platform:</strong> ${source}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #27ae60;">✅ Submitted</span></p>
        </div>

        <p style="color: #7f8c8d;">
          Your application has been successfully submitted. We'll keep you updated on the status.
        </p>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your AI Job Agent.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `📤 Application Submitted: ${jobTitle} at ${company}`,
      html,
    });
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(
    email: string,
    summary: {
      jobsFound: number;
      applicationsSubmitted: number;
      successRate: number;
      bySource: Record<string, any>;
    }
  ): Promise<boolean> {
    const sourceDetails = Object.entries(summary.bySource)
      .map(
        ([source, stats]: [string, any]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ecf0f1;">${source}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ecf0f1; text-align: center;">${stats.jobsFound || 0}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ecf0f1; text-align: center;">${stats.applicationsSubmitted || 0}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📊 Daily Job Search Summary</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
              <p style="color: #7f8c8d; margin: 0 0 5px 0; font-size: 12px;">Jobs Found</p>
              <h3 style="color: #3498db; margin: 0; font-size: 28px;">${summary.jobsFound}</h3>
            </div>
            <div>
              <p style="color: #7f8c8d; margin: 0 0 5px 0; font-size: 12px;">Applications</p>
              <h3 style="color: #27ae60; margin: 0; font-size: 28px;">${summary.applicationsSubmitted}</h3>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #ecf0f1;">
                <th style="padding: 10px; text-align: left;">Source</th>
                <th style="padding: 10px; text-align: center;">Jobs Found</th>
                <th style="padding: 10px; text-align: center;">Applications</th>
              </tr>
            </thead>
            <tbody>
              ${sourceDetails}
            </tbody>
          </table>

          <div style="margin-top: 20px;">
            <p style="color: #7f8c8d; margin: 0 0 5px 0; font-size: 12px;">Success Rate</p>
            <div style="background-color: #ecf0f1; height: 20px; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #27ae60; height: 100%; width: ${summary.successRate}%; transition: width 0.3s ease;"></div>
            </div>
            <p style="text-align: right; color: #7f8c8d; font-size: 12px; margin: 5px 0 0 0;">${summary.successRate}%</p>
          </div>
        </div>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your AI Job Agent.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `📊 Daily Summary: ${summary.jobsFound} jobs found, ${summary.applicationsSubmitted} applications submitted`,
      html,
    });
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(
    email: string,
    errorTitle: string,
    errorMessage: string,
    source?: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">⚠️ Error Occurred</h2>
        
        <div style="background-color: #fadbd8; padding: 20px; border-left: 4px solid #e74c3c; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: #c0392b; margin: 0 0 10px 0;">${errorTitle}</h3>
          <p style="margin: 5px 0; color: #7f8c8d;">${errorMessage}</p>
          ${source ? `<p style="margin: 5px 0;"><strong>Source:</strong> ${source}</p>` : ''}
        </div>

        <p style="color: #7f8c8d;">
          Please check your system and try again. If the issue persists, please review the logs.
        </p>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your AI Job Agent.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `⚠️ Error: ${errorTitle}`,
      html,
    });
  }

  /**
   * Send application status update
   */
  async sendApplicationStatusUpdate(
    email: string,
    jobTitle: string,
    company: string,
    newStatus: string,
    source: string
  ): Promise<boolean> {
    const statusColors: Record<string, string> = {
      pending: '#f39c12',
      applied: '#3498db',
      rejected: '#e74c3c',
      accepted: '#27ae60',
      interview: '#9b59b6',
      offer: '#27ae60',
    };

    const statusColor = statusColors[newStatus] || '#95a5a6';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📬 Application Status Update</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin: 0 0 10px 0;">${jobTitle}</h3>
          <p style="margin: 5px 0;"><strong>Company:</strong> ${company}</p>
          <p style="margin: 5px 0;"><strong>Platform:</strong> ${source}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="color: #7f8c8d; margin: 0 0 10px 0; font-size: 12px;">Current Status</p>
          <h3 style="color: ${statusColor}; margin: 0; text-transform: uppercase; font-size: 20px;">${newStatus}</h3>
        </div>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your AI Job Agent.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `📬 Application Status Update: ${newStatus.toUpperCase()} - ${jobTitle}`,
      html,
    });
  }

  /**
   * Test email configuration
   */
  async testConfiguration(testEmail: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">✅ Test Email</h2>
        <p>If you received this email, your email configuration is working correctly!</p>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
          This is a test email from your AI Job Agent.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: testEmail,
      subject: '✅ AI Job Agent - Email Configuration Test',
      html,
    });
  }

  /**
   * Check if email service is enabled
   */
  isEnabled(): boolean {
    return this.isConfigured && config.email.enabled;
  }
}

// Export singleton instance
export const emailService = new EmailService();
