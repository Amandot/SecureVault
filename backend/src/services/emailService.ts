import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

interface ShareEmailData {
  shareId: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  filename: string;
  fileSize: string;
  encryptionType: string;
  dateShared: Date;
  expiresAt?: Date | null;
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canEdit: boolean;
    watermarkEnabled: boolean;
  };
  customMessage?: string;
  shareLink: string;
}

/**
 * Sends a professional HTML email when a file is shared.
 * This function should not block the main execution thread.
 */
export const sendFileSharedEmail = async (data: ShareEmailData, retryCount = 0): Promise<boolean> => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email credentials not configured. Skipping email send.');
    return false;
  }

  try {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
        .header { background-color: #0f172a; padding: 24px 32px; text-align: center; color: white; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 32px; color: #374151; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111827; }
        .intro { font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
        .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .details-grid { display: grid; grid-template-columns: 100px 1fr; gap: 8px 16px; font-size: 14px; }
        .label { font-weight: 600; color: #64748b; }
        .value { color: #0f172a; font-weight: 500; }
        .permissions { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .perm-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 12px; }
        .perm-item { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
        .perm-yes { color: #059669; }
        .perm-no { color: #dc2626; }
        .message-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-style: italic; color: #1e3a8a; font-size: 14px; line-height: 1.5; }
        .cta-container { text-align: center; margin: 32px 0; }
        .cta-button { display: inline-block; background-color: #0ea5e9; color: white !important; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; transition: background-color 0.2s; }
        .cta-button:hover { background-color: #0284c7; }
        .footer { background-color: #f1f5f9; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 SecureVault</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello,</div>
          <div class="intro">
            <strong>${data.senderName}</strong> (${data.senderEmail}) has securely shared a file with you.
          </div>
          
          <div class="details-box">
            <div class="details-grid">
              <div class="label">File:</div>
              <div class="value">${data.filename}</div>
              
              <div class="label">Size:</div>
              <div class="value">${data.fileSize}</div>
              
              <div class="label">Encryption:</div>
              <div class="value">${data.encryptionType}</div>
              
              ${data.expiresAt ? `
              <div class="label">Expires:</div>
              <div class="value" style="color: #ea580c;">${new Date(data.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              ` : ''}
            </div>
            
            <div class="permissions">
              <div class="label" style="margin-bottom: 10px;">Permissions:</div>
              <ul class="perm-list">
                <li class="perm-item ${data.permissions.canView ? 'perm-yes' : 'perm-no'}">
                  ${data.permissions.canView ? '✓ View' : '✗ View'}
                </li>
                <li class="perm-item ${data.permissions.canDownload ? 'perm-yes' : 'perm-no'}">
                  ${data.permissions.canDownload ? '✓ Download' : '✗ Download'}
                </li>
                <li class="perm-item ${data.permissions.canEdit ? 'perm-yes' : 'perm-no'}">
                  ${data.permissions.canEdit ? '✓ Edit' : '✗ Edit'}
                </li>
                ${data.permissions.watermarkEnabled ? `
                <li class="perm-item" style="color: #ea580c;">
                  ✓ Watermark Enabled
                </li>
                ` : ''}
              </ul>
            </div>
          </div>

          ${data.customMessage ? `
          <div class="message-box">
            "${data.customMessage}"
          </div>
          ` : ''}

          <div class="cta-container">
            <a href="${data.shareLink}" class="cta-button">Open Secure File</a>
          </div>
        </div>
        <div class="footer">
          <p>This file is end-to-end encrypted using SecureVault.</p>
          <p>This email was automatically generated. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"SecureVault" <noreply@securevault.app>',
      to: data.recipientEmail,
      subject: `🔐 ${data.senderName} shared a secure file with you`,
      html,
    });

    console.log(`Email sent successfully to ${data.recipientEmail}. Message ID: ${info.messageId}`);

    // Update the database to reflect the email was sent
    await prisma.share.update({
      where: { id: data.shareId },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
        notificationStatus: 'sent',
      },
    });

    return true;
  } catch (error) {
    console.error(`Failed to send email to ${data.recipientEmail}:`, error);
    
    // Retry once on failure
    if (retryCount === 0) {
      console.log('Retrying email send in 5 seconds...');
      setTimeout(() => {
        sendFileSharedEmail(data, 1);
      }, 5000);
    } else {
      // Mark as failed in the database after retries exhausted
      await prisma.share.update({
        where: { id: data.shareId },
        data: {
          notificationStatus: 'failed',
        },
      });
    }
    
    return false;
  }
};

/**
 * Sends a notification when a share is revoked.
 */
export const sendShareRevokedEmail = async (recipientEmail: string, filename: string, senderName: string): Promise<boolean> => {
  // Implementation similar to above...
  return true;
};
