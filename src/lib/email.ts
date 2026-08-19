/**
 * Email is OPTIONAL and OFF by default.
 *
 * No feature may depend on email working. `sendEmail()` never throws and never rejects:
 * with no `RESEND_API_KEY` it prints the message to the server console and reports
 * success, so verification links, invites and notifications are all readable from
 * `npm run dev` output during the hackathon.
 *
 * To turn it on: set RESEND_API_KEY (and optionally EMAIL_FROM) in `.env.local` and
 * install the `resend` package. Nothing else changes.
 */

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export interface EmailResult {
  ok: boolean
  /** Which implementation actually handled the message. */
  provider: 'resend' | 'console'
  id?: string
  error?: string
}

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailResult>
}

const FROM = process.env.EMAIL_FROM ?? 'Hackathon Starter <onboarding@resend.dev>'

/** Default implementation. Always available, always succeeds. */
export const consoleEmailSender: EmailSender = {
  async send(message) {
    console.log(
      [
        '',
        '--- email (not sent: RESEND_API_KEY is unset) ---',
        `from:    ${FROM}`,
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        '',
        message.text,
        '------------------------------------------------',
        '',
      ].join('\n'),
    )
    return { ok: true, provider: 'console' }
  },
}

/**
 * Resend implementation. The package is imported lazily *and* through a non-literal
 * specifier on purpose: `resend` is an optional dependency, so a static import would
 * break `next build` for anyone who has not installed it.
 */
export const resendEmailSender: EmailSender = {
  async send(message) {
    try {
      const specifier = 'resend'
      const mod = (await import(/* webpackIgnore: true */ specifier)) as {
        Resend: new (apiKey: string) => {
          emails: {
            send(input: {
              from: string
              to: string
              subject: string
              text: string
              html?: string
            }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>
          }
        }
      }

      const client = new mod.Resend(process.env.RESEND_API_KEY as string)
      const { data, error } = await client.emails.send({
        from: FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })

      if (error) {
        // Degrade, never throw: log the payload so the link is still recoverable.
        console.error('[email] resend failed, falling back to console:', error.message)
        await consoleEmailSender.send(message)
        return { ok: false, provider: 'resend', error: error.message }
      }

      return { ok: true, provider: 'resend', id: data?.id }
    } catch (e) {
      console.error('[email] resend unavailable, falling back to console:', e)
      await consoleEmailSender.send(message)
      return { ok: false, provider: 'resend', error: e instanceof Error ? e.message : String(e) }
    }
  },
}

export function getEmailSender(): EmailSender {
  return process.env.RESEND_API_KEY ? resendEmailSender : consoleEmailSender
}

/**
 * The only function callers should need. Never throws.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  try {
    return await getEmailSender().send(message)
  } catch (e) {
    console.error('[email] send failed:', e)
    return { ok: false, provider: 'console', error: e instanceof Error ? e.message : String(e) }
  }
}
