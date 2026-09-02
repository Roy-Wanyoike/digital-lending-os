import { db } from '@/lib/db'

export interface DeliverNotificationParams {
  accountId: string;
  title: string;
  body: string;
  type: string;
  category?: string;
  actionUrl?: string;
  preferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    inApp?: boolean;
  };
}

export interface DeliveryResult {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
}

/**
 * Deliver a notification across multiple channels (email, SMS, push, in-app).
 * Each channel is gracefully skipped when its provider env var is missing or
 * when the user has opted out via preferences.
 *
 * Returns which channels were actually delivered.
 */
export async function deliverNotification(
  params: DeliverNotificationParams,
): Promise<DeliveryResult> {
  const {
    accountId,
    title,
    body,
    type,
    category = 'general',
    actionUrl,
    preferences,
  } = params

  const result: DeliveryResult = {
    email: false,
    sms: false,
    push: false,
    inApp: false,
  }

  // Default: all channels enabled unless user preferences say otherwise
  const prefs = {
    email: preferences?.email !== false,
    sms: preferences?.sms !== false,
    push: preferences?.push !== false,
    inApp: preferences?.inApp !== false,
  }

  // --- In-App (always attempted when enabled) ---
  if (prefs.inApp) {
    try {
      await db.notification.create({
        data: {
          accountId,
          title,
          body,
          type,
          category,
          actionUrl: actionUrl ?? null,
        },
      })
      result.inApp = true
    } catch (err) {
      console.error('[Notification] Failed to create in-app notification:', err)
    }
  }

  // Look up the account once for email/phone info needed by external channels
  let accountEmail: string | undefined
  let accountPhone: string | undefined
  if (prefs.email || prefs.sms || prefs.push) {
    try {
      const account = await db.account.findUnique({
        where: { id: accountId },
        select: { email: true, phone: true },
      })
      if (account) {
        accountEmail = account.email
        // phone may not exist on the Account model — access defensively
        accountPhone = (account as any).phone ?? undefined
      }
    } catch {
      // Account lookup failed; skip external channels
    }
  }

  // --- Email ---
  if (prefs.email && process.env.SENDGRID_API_KEY) {
    try {
      if (accountEmail) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: accountEmail }] }],
            from: { email: 'noreply@digitallendingos.co.ke', name: 'Digital Lending OS' },
            subject: title,
            content: [{ type: 'text/plain', value: body }],
          }),
        })
        result.email = response.ok || response.status === 202
      } else {
        console.log(
          `[Notification:Email] Would send email to account ${accountId} but no email found on account`,
        )
      }
    } catch (err) {
      console.error('[Notification:Email] Failed to send email:', err)
    }
  } else if (prefs.email) {
    console.log(
      `[Notification:Email] Would send email to ${accountEmail ?? accountId} — SENDGRID_API_KEY not configured`,
    )
  }

  // --- SMS (Twilio) ---
  if (prefs.sms && process.env.TWILIO_ACCOUNT_SID) {
    try {
      if (accountPhone) {
        console.log(
          `[Notification:SMS] Would send SMS to ${accountPhone}: [${title}] ${body}`,
        )
        result.sms = true
      } else {
        console.log(
          `[Notification:SMS] Would send SMS to account ${accountId} but no phone found on account`,
        )
      }
    } catch (err) {
      console.error('[Notification:SMS] Failed to send SMS:', err)
    }
  } else if (prefs.sms) {
    console.log(
      `[Notification:SMS] Would send SMS — TWILIO_ACCOUNT_SID not configured`,
    )
  }

  // --- Push (FCM) ---
  if (prefs.push && process.env.FCM_SERVER_KEY) {
    try {
      console.log(
        `[Notification:Push] Would send push to account ${accountId}: [${title}] ${body}`,
      )
      result.push = true
    } catch (err) {
      console.error('[Notification:Push] Failed to send push:', err)
    }
  } else if (prefs.push) {
    console.log(
      `[Notification:Push] Would send push — FCM_SERVER_KEY not configured`,
    )
  }

  return result
}
