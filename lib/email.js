// Email service using Resend
import { Resend } from 'resend';

// Initialize Resend with a dummy key if not configured (prevents constructor error)
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_development');
const FROM_EMAIL = process.env.FROM_EMAIL || 'Safar <noreply@safarcurated.com>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@safarcurated.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

// Email templates
export const EmailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Safar',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 0.5px;">Welcome to Safar</h1>
        </div>
        <div style="padding: 36px 28px; background: #f9fafb;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">Hi ${name},</h2>
          <p style="color: #374151; line-height: 1.65; font-size: 15px; margin: 0 0 14px 0;">
            Thank you for joining <strong>Safar</strong> — we're so glad to have you with us.
          </p>
          <p style="color: #374151; line-height: 1.65; font-size: 15px; margin: 0 0 14px 0;">
            Your email is verified and your account is ready. You can now explore curated <strong>stays</strong>,
            unforgettable <strong>experiences</strong>, and connect with trusted <strong>local hosts</strong>.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${BASE_URL}/explore"
               style="background: #10b981; color: #ffffff; padding: 13px 34px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Start Exploring
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
            Need a hand? We're here to help — reach us anytime at
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #059669; text-decoration: none;">${SUPPORT_EMAIL}</a>.
          </p>
        </div>
        <div style="padding: 18px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Safar. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  emailVerification: (name, verificationLink) => ({
    subject: 'Welcome to Safar – Verify Your Email Address',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: 0.5px;">Welcome to Safar</h1>
          <p style="color: rgba(255,255,255,0.92); margin: 8px 0 0 0; font-size: 14px;">One quick step to get you started</p>
        </div>
        <div style="padding: 36px 28px; background: #f9fafb;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">Hi ${name},</h2>
          <p style="color: #374151; line-height: 1.65; font-size: 15px; margin: 0 0 14px 0;">
            Thanks for signing up. Please verify your email address so we can secure your account
            and unlock the full Safar experience.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${verificationLink}"
               style="background: #10b981; color: #ffffff; padding: 13px 34px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 18px 0 0 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${verificationLink}" style="color: #059669; word-break: break-all; text-decoration: none;">${verificationLink}</a>
          </p>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 18px 0 0 0;">
            This link expires in <strong>24 hours</strong> and can be used only once. If you didn't create a Safar account,
            you can safely ignore this email.
          </p>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 18px 0 0 0;">
            Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color: #059669; text-decoration: none;">${SUPPORT_EMAIL}</a>.
          </p>
        </div>
        <div style="padding: 18px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Safar. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (name, resetLink) => ({
    subject: 'Reset Your Safar Password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 0.5px;">Reset Your Password</h1>
        </div>
        <div style="padding: 36px 28px; background: #f9fafb;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">Hi ${name},</h2>
          <p style="color: #374151; line-height: 1.65; font-size: 15px; margin: 0 0 14px 0;">
            We received a request to reset the password for your Safar account. Click the button below to choose a new one.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetLink}"
               style="background: #10b981; color: #ffffff; padding: 13px 34px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 18px 0 0 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #059669; word-break: break-all; text-decoration: none;">${resetLink}</a>
          </p>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 18px 0 0 0;">
            This link expires in <strong>1 hour</strong> and can be used only once. If you didn't request a password reset,
            you can safely ignore this email — your password will remain unchanged.
          </p>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 18px 0 0 0;">
            Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #059669; text-decoration: none;">${SUPPORT_EMAIL}</a>.
          </p>
        </div>
        <div style="padding: 18px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Safar. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  bookingConfirmation: (travelerName, booking) => ({
    subject: `Booking Confirmed - ${booking.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed! ✅</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${travelerName},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Your booking has been confirmed! Here are your details:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">${booking.listingTitle}</h3>
            ${booking.inventoryTypeName ? `<p style="color: #10b981; font-weight: 600; margin: 5px 0;">${booking.inventoryTypeName}</p>` : ''}
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
              <p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p style="margin: 5px 0;"><strong>Guests:</strong> ${booking.guests}</p>
              <p style="margin: 5px 0;"><strong>Nights:</strong> ${booking.nights}</p>
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0;">
                Total: ₹${booking.totalPrice.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Host:</strong> ${booking.hostName}<br/>
              Your host will contact you soon with check-in details.
            </p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/traveler" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View Booking Details
            </a>
          </div>
        </div>
      </div>
    `,
  }),

  bookingNotificationHost: (hostName, booking) => ({
    subject: `New Booking Request - ${booking.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Booking Request! 📬</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${hostName},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            You have a new booking request for your listing:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">${booking.listingTitle}</h3>
            ${booking.inventoryTypeName ? `<p style="color: #10b981; font-weight: 600; margin: 5px 0;">${booking.inventoryTypeName}</p>` : ''}
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Guest:</strong> ${booking.travelerName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${booking.travelerEmail}</p>
              <p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p style="margin: 5px 0;"><strong>Guests:</strong> ${booking.guests}</p>
              <p style="margin: 5px 0;"><strong>Total:</strong> ₹${booking.totalPrice.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/host" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px;">
              Approve Booking
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Please respond to this booking request within 24 hours.
          </p>
        </div>
      </div>
    `,
  }),

  bookingCancellation: (name, booking, isHost) => ({
    subject: `Booking Cancelled - ${booking.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 40px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Booking Cancelled</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            This booking has been cancelled:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin-top: 0; color: #1f2937;">${booking.listingTitle}</h3>
            ${booking.inventoryTypeName ? `<p style="color: #6b7280; margin: 5px 0;">${booking.inventoryTypeName}</p>` : ''}
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
              <p style="margin: 5px 0;"><strong>Dates:</strong> ${new Date(booking.checkInDate).toLocaleDateString('en-IN')} - ${new Date(booking.checkOutDate).toLocaleDateString('en-IN')}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${booking.totalPrice.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            ${isHost ? 'The guest has cancelled this booking.' : 'Your cancellation has been processed. Any applicable refund will be processed within 5-7 business days.'}
          </p>
        </div>
      </div>
    `,
  }),

  bookingApproved: (travelerName, booking) => ({
    subject: `Booking Approved - ${booking.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Approved! 🎉</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${travelerName},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Great news! Your booking has been approved by the host.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #1f2937;">${booking.listingTitle}</h3>
            ${booking.inventoryTypeName ? `<p style="color: #10b981; font-weight: 600; margin: 5px 0;">${booking.inventoryTypeName}</p>` : ''}
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
              <p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              <p style="margin: 5px 0;"><strong>Guests:</strong> ${booking.guests}</p>
              <p style="margin: 5px 0;"><strong>Host:</strong> ${booking.hostName}</p>
              <p style="margin: 5px 0; font-size: 16px; font-weight: bold; margin-top: 10px;">Total: ₹${booking.totalPrice.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/traveler" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View Booking
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Your host will contact you shortly with check-in instructions.
          </p>
        </div>
      </div>
    `,
  }),

  bookingRejected: (travelerName, booking, reason) => ({
    subject: `Booking Not Available - ${booking.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 40px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Booking Unavailable</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${travelerName},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            We're sorry, but your booking request could not be confirmed.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #1f2937;">${booking.listingTitle}</h3>
            ${booking.inventoryTypeName ? `<p style="color: #6b7280; margin: 5px 0;">${booking.inventoryTypeName}</p>` : ''}
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Dates:</strong> ${new Date(booking.checkInDate).toLocaleDateString('en-IN')} - ${new Date(booking.checkOutDate).toLocaleDateString('en-IN')}</p>
              ${reason ? `<p style="margin: 15px 0 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/explore" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Browse Other Listings
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Don't worry! There are many other amazing places waiting for you in Kashmir.
          </p>
        </div>
      </div>
    `,
  }),

  invoice: (travelerName, booking, invoiceId) => ({
    subject: `Invoice #${invoiceId} - ${booking.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; padding: 30px; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Invoice</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Safar Kashmir</p>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Invoice Number</p>
            <p style="color: #1f2937; margin: 0; font-size: 18px; font-weight: bold;">#${invoiceId}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #1f2937;">Billed To</h3>
            <p style="color: #6b7280; margin: 5px 0;">${travelerName}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Booking ID: ${booking.bookingId}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #1f2937;">Booking Details</h3>
            <p style="color: #1f2937; font-weight: 600; margin: 5px 0;">${booking.listingTitle}</p>
            ${booking.inventoryTypeName ? `<p style="color: #10b981; margin: 5px 0;">${booking.inventoryTypeName}</p>` : ''}
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Check-in: ${new Date(booking.checkInDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Check-out: ${new Date(booking.checkOutDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Guests: ${booking.guests}</p>
            <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">Nights: ${booking.nights}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0; color: #6b7280;">Accommodation (${booking.nights} nights × ₹${booking.pricePerNight.toLocaleString('en-IN')})</td>
                <td style="padding: 10px 0; text-align: right; color: #1f2937; font-weight: 600;">₹${booking.totalPrice.toLocaleString('en-IN')}</td>
              </tr>
              <tr style="border-top: 2px solid #1f2937;">
                <td style="padding: 15px 0 0 0; color: #1f2937; font-weight: bold; font-size: 16px;">Total Amount</td>
                <td style="padding: 15px 0 0 0; text-align: right; color: #10b981; font-weight: bold; font-size: 18px;">₹${booking.totalPrice.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">
            Thank you for choosing Safar Kashmir. For any queries, please contact support.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Safar Kashmir. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  contactFormNotification: (formData) => ({
    subject: `New Contact Form Submission - ${formData.subject || 'General Inquiry'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; padding: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #1f2937;">Contact Information</h3>
            <p style="color: #6b7280; margin: 5px 0;"><strong>Name:</strong> ${formData.name}</p>
            <p style="color: #6b7280; margin: 5px 0;"><strong>Email:</strong> ${formData.email}</p>
            ${formData.phone ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Phone:</strong> ${formData.phone}</p>` : ''}
            ${formData.subject ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Subject:</strong> ${formData.subject}</p>` : ''}
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #1f2937;">Message</h3>
            <p style="color: #4b5563; line-height: 1.6; margin: 0;">
              ${formData.message.replace(/\n/g, '<br/>')}
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Submitted on: ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </div>
    `,
  }),

  bookingInquiry: (hostName, inquiry) => ({
    subject: `Booking Inquiry - ${inquiry.listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Booking Inquiry 💬</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${hostName},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            A traveler is interested in your listing:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">${inquiry.listingTitle}</h3>
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px;">
              <p style="margin: 5px 0;"><strong>Interested Guest:</strong> ${inquiry.guestName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${inquiry.guestEmail}</p>
              ${inquiry.checkIn ? `<p style="margin: 5px 0;"><strong>Preferred Dates:</strong> ${inquiry.checkIn} to ${inquiry.checkOut}</p>` : ''}
              ${inquiry.guests ? `<p style="margin: 5px 0;"><strong>Guests:</strong> ${inquiry.guests}</p>` : ''}
              ${inquiry.message ? `<p style="margin: 15px 0 5px 0;"><strong>Message:</strong><br/>${inquiry.message}</p>` : ''}
            </div>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/host" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Respond to Inquiry
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Quick responses increase your booking rate. Reply within 24 hours for the best results.
          </p>
        </div>
      </div>
    `,
  }),
};

// Send email function
export async function sendEmail({ to, subject, html }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email not sent:', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', { to, subject, id: data?.id });
    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error: error.message };
  }
}

// Convenience functions
export async function sendWelcomeEmail(user) {
  const { subject, html } = EmailTemplates.welcome(user.name);
  return sendEmail({ to: user.email, subject, html });
}

export async function sendBookingConfirmation(booking, traveler) {
  const { subject, html } = EmailTemplates.bookingConfirmation(traveler.name, booking);
  return sendEmail({ to: traveler.email, subject, html });
}

export async function sendBookingNotificationToHost(booking, host) {
  const { subject, html } = EmailTemplates.bookingNotificationHost(host.name, booking);
  return sendEmail({ to: host.email, subject, html });
}

export async function sendBookingCancellationEmail(booking, user, isHost) {
  const { subject, html } = EmailTemplates.bookingCancellation(user.name, booking, isHost);
  return sendEmail({ to: user.email, subject, html });
}

export async function sendVerificationEmail(user, verificationLink) {
  const { subject, html } = EmailTemplates.emailVerification(user.name, verificationLink);
  return sendEmail({ to: user.email, subject, html });
}

export async function sendPasswordResetEmail(user, resetLink) {
  const { subject, html } = EmailTemplates.passwordReset(user.name, resetLink);
  return sendEmail({ to: user.email, subject, html });
}

export async function sendBookingApprovedEmail(booking, traveler) {
  const { subject, html } = EmailTemplates.bookingApproved(traveler.name, booking);
  return sendEmail({ to: traveler.email, subject, html });
}

export async function sendBookingRejectedEmail(booking, traveler, reason) {
  const { subject, html } = EmailTemplates.bookingRejected(traveler.name, booking, reason);
  return sendEmail({ to: traveler.email, subject, html });
}

export async function sendInvoiceEmail(booking, traveler, invoiceId) {
  const { subject, html } = EmailTemplates.invoice(traveler.name, booking, invoiceId);
  return sendEmail({ to: traveler.email, subject, html });
}

export async function sendContactFormEmail(formData, recipientEmail = 'admin@safarkashmir.com') {
  const { subject, html } = EmailTemplates.contactFormNotification(formData);
  return sendEmail({ to: recipientEmail, subject, html });
}

export async function sendBookingInquiryEmail(inquiry, host) {
  const { subject, html } = EmailTemplates.bookingInquiry(host.name, inquiry);
  return sendEmail({ to: host.email, subject, html });
}
