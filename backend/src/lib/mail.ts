import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'CutCast <suporte@cutcast.com.br>';

export async function sendVideoReadyEmail(
  userEmail: string,
  videoTitle: string,
  projectUrl: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0a1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0a1e; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width: 480px; background-color: #1a1230; border-radius: 12px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 24px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #a855f7, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    CutCast
                  </h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 0 32px 16px; text-align: center;">
                  <p style="font-size: 28px; margin: 0 0 16px;">&#9986;&#65039;</p>
                  <h2 style="margin: 0 0 12px; font-size: 20px; color: #ffffff; font-weight: 600;">
                    Seus cortes estão prontos!
                  </h2>
                  <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                    O processamento do vídeo <strong style="color: #d4d4d8;">${videoTitle}</strong> terminou.
                  </p>
                  <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                    Seus cortes virais já estão disponíveis.
                  </p>
                </td>
              </tr>
              <!-- Button -->
              <tr>
                <td style="padding: 0 32px 32px; text-align: center;">
                  <a href="${projectUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                    Ver Cortes
                  </a>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; border-top: 1px solid #2a2045; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #71717a;">
                    Você recebeu este e-mail porque processou um vídeo no CutCast.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: 'Seus cortes estão prontos! ✂️',
    html,
  });
}
