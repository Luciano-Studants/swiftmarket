import nodemailer from 'nodemailer';

/**
 * Envio de e-mail atrás de uma interface mínima: `send({ to, subject, text }) -> Promise`.
 * - Com SMTP_URL (ex.: smtps://usuario:senha@smtp.provedor.com:465): envia de verdade.
 * - Sem SMTP_URL (só desenvolvimento): imprime o e-mail no log, incluindo o código.
 */
export function createMailer(config) {
  if (!config.smtpUrl) {
    return {
      async send({ to, subject, text }) {
        console.log(`\n[mail:dev] Para: ${to}\n[mail:dev] Assunto: ${subject}\n${text}\n`);
      },
    };
  }

  const transport = nodemailer.createTransport(config.smtpUrl);
  return {
    send: ({ to, subject, text }) =>
      transport.sendMail({ from: config.mailFrom, to, subject, text }),
  };
}
