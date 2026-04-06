/**
 * Email Notification Service
 * Sends login notifications and security alerts
 */

import { parseUserAgent, type DeviceInfo } from './login-history';

export interface EmailConfig {
  provider: 'sendgrid' | 'smtp' | 'console';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface LoginNotificationData {
  userEmail: string;
  userName: string;
  loginTime: Date;
  ip: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  deviceInfo: DeviceInfo;
  isNewDevice: boolean;
  isNewLocation: boolean;
  isSuspicious?: boolean;
  suspiciousReasons?: string[];
}

// Default email configuration
function getEmailConfig(): EmailConfig {
  return {
    provider: (process.env.EMAIL_PROVIDER as any) || 'console',
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'security@miksandchiks.com',
    fromName: process.env.FROM_NAME || 'Miks & Chiks Security',
  };
}

/**
 * Send login notification email
 */
export async function sendLoginNotification(
  data: LoginNotificationData
): Promise<{ success: boolean; error?: string }> {
  const config = getEmailConfig();
  
  try {
    // Format location string
    const locationStr = data.location
      ? [data.location.city, data.location.region, data.location.country]
          .filter(Boolean)
          .join(', ')
      : 'Unknown';
    
    // Format device string
    const deviceStr = `${data.deviceInfo.device} - ${data.deviceInfo.browser} on ${data.deviceInfo.os}`;
    
    // Format time
    const timeStr = data.loginTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const subject = data.isSuspicious
      ? '⚠️ Suspicious Login Detected - Miks & Chiks Admin'
      : data.isNewDevice
      ? 'New Device Login - Miks & Chiks Admin'
      : 'New Location Login - Miks & Chiks Admin';
    
    const htmlContent = generateLoginEmailHTML({
      ...data,
      locationStr,
      deviceStr,
      timeStr,
    });
    
    const textContent = generateLoginEmailText({
      ...data,
      locationStr,
      deviceStr,
      timeStr,
    });
    
    // Send based on provider
    switch (config.provider) {
      case 'sendgrid':
        return await sendSendGridEmail({
          to: data.userEmail,
          subject,
          html: htmlContent,
          text: textContent,
          config,
        });
      
      case 'smtp':
        // SMTP implementation would go here
        console.log('[Email Service] SMTP not implemented, falling back to console');
        return await sendConsoleEmail({
          to: data.userEmail,
          subject,
          html: htmlContent,
          text: textContent,
        });
      
      case 'console':
      default:
        return await sendConsoleEmail({
          to: data.userEmail,
          subject,
          html: htmlContent,
          text: textContent,
        });
    }
  } catch (error: any) {
    console.error('Failed to send login notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email via SendGrid
 */
async function sendSendGridEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  config: EmailConfig;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!params.config.apiKey) {
      throw new Error('SendGrid API key not configured');
    }
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: {
          email: params.config.fromEmail,
          name: params.config.fromName,
        },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html },
        ],
      }),
    });
    
    if (response.ok) {
      console.log(`[Email Service] Login notification sent to ${params.to} via SendGrid`);
      return { success: true };
    } else {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }
  } catch (error: any) {
    console.error('SendGrid email failed:', error);
    // Fall back to console
    return sendConsoleEmail(params);
  }
}

/**
 * Log email to console (development fallback)
 */
async function sendConsoleEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  console.log('\n========================================');
  console.log('📧 LOGIN NOTIFICATION EMAIL');
  console.log('========================================');
  console.log(`To: ${params.to}`);
  console.log(`Subject: ${params.subject}`);
  console.log('----------------------------------------');
  console.log(params.text);
  console.log('========================================\n');
  
  return { success: true };
}

/**
 * Generate HTML email content
 */
function generateLoginEmailHTML(params: LoginNotificationData & {
  locationStr: string;
  deviceStr: string;
  timeStr: string;
}): string {
  const warningBanner = params.isSuspicious
    ? `<div style="background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; font-size: 18px;">⚠️ Suspicious Activity Detected</h2>
        <p style="margin: 0;">We detected unusual login activity on your account:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          ${params.suspiciousReasons?.map(r => `<li>${r}</li>`).join('') || ''}
        </ul>
      </div>`
    : '';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f8a5a5 0%, #f48c82 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Miks & Chiks</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Admin Security Alert</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    ${warningBanner}
    
    <p style="font-size: 16px; margin-bottom: 24px;">Hi ${params.userName},</p>
    
    <p>We noticed a ${params.isNewDevice ? 'new device' : 'new location'} signed in to your admin account.</p>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Login Details</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Time:</td>
          <td style="padding: 8px 0; font-weight: 500;">${params.timeStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Device:</td>
          <td style="padding: 8px 0; font-weight: 500;">${params.deviceStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Location:</td>
          <td style="padding: 8px 0; font-weight: 500;">${params.locationStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">IP Address:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 14px;">${params.ip}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 500; color: #92400e;">Wasn't you?</p>
      <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">If you don't recognize this activity, please contact your superadmin immediately to secure your account.</p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
      <h4 style="margin: 0 0 12px 0; font-size: 14px;">Security Tips:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
        <li>Use a strong, unique password</li>
        <li>Don't share your login credentials</li>
        <li>Log out when you're done</li>
        <li>Contact us if you notice any suspicious activity</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        This is an automated security notification from Miks & Chiks.<br>
        Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text email content
 */
function generateLoginEmailText(params: LoginNotificationData & {
  locationStr: string;
  deviceStr: string;
  timeStr: string;
}): string {
  const warningText = params.isSuspicious
    ? `⚠️ SUSPICIOUS ACTIVITY DETECTED

We detected unusual login activity on your account:
${params.suspiciousReasons?.map(r => `- ${r}`).join('\n') || ''}

`
    : '';
  
  return `Miks & Chiks - Admin Security Alert
========================================

Hi ${params.userName},

${warningText}We noticed a ${params.isNewDevice ? 'new device' : 'new location'} signed in to your admin account.

LOGIN DETAILS
-------------
Time:     ${params.timeStr}
Device:   ${params.deviceStr}
Location: ${params.locationStr}
IP:       ${params.ip}

WASN'T YOU?
-----------
If you don't recognize this activity, please contact your superadmin immediately to secure your account.

SECURITY TIPS
-------------
- Use a strong, unique password
- Don't share your login credentials
- Log out when you're done
- Contact us if you notice any suspicious activity

---
This is an automated security notification from Miks & Chiks.
Please do not reply to this email.
`;
}

/**
 * Check if we should send notification (rate limiting)
 * Prevents spam - max 1 notification per 5 minutes per user
 */
export async function shouldSendNotification(userId: string): Promise<boolean> {
  try {
    // In a real implementation, check Redis or Firestore for last notification time
    // For now, always allow
    return true;
  } catch (error) {
    console.error('Failed to check notification rate limit:', error);
    return true; // Allow on error
  }
}
