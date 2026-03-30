"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transport = nodemailer_1.default.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "821e09ac9d49ac",
        pass: "fe7a86e0506ec7"
    }
});
class EmailService {
    async sendVerificationEmail(input) {
        const recipientName = input.toName?.trim() || "there";
        const subject = "Confirm your Logtail email";
        const plainText = [
            `Hi ${recipientName},`,
            "",
            "Thanks for signing up to Logtail.",
            "Confirm your email address to activate your account:",
            input.verificationUrl,
            "",
            "If you didn't request this, you can ignore this message."
        ].join("\n");
        const html = `
      <div style="background:#0a0a0a;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;background:#111;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px 28px;">
              <p style="margin:0 0 10px 0;color:#a1a1aa;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Logtail</p>
              <h1 style="margin:0;color:#fafafa;font-size:24px;line-height:1.3;font-weight:600;">Confirm your email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 10px 28px;color:#d4d4d8;font-size:15px;line-height:1.6;">
              Hi ${escapeHtml(recipientName)},<br/><br/>
              Welcome to Logtail. Click the button below to verify your email address and finish creating your account.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 10px 28px;">
              <a href="${input.verificationUrl}" style="display:inline-block;background:#06b6d4;color:#0a0a0a;font-weight:600;text-decoration:none;padding:11px 16px;border-radius:8px;font-size:14px;">Verify email</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 28px 28px;color:#a1a1aa;font-size:12px;line-height:1.6;">
              If the button does not work, paste this URL in your browser:<br/>
              <a href="${input.verificationUrl}" style="color:#67e8f9;word-break:break-all;">${input.verificationUrl}</a><br/><br/>
              If you didn't request this email, you can safely ignore it.
            </td>
          </tr>
        </table>
      </div>
    `;
        await transport.sendMail({
            from: "Logtail <noreply@logtail.local>",
            to: input.toEmail,
            subject,
            text: plainText,
            html
        });
    }
}
exports.EmailService = EmailService;
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
