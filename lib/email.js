// Email service using Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'Safar Kashmir <noreply@safar.com>';

// Email templates
export const EmailTemplates = {
  welcome: (name) => ({
    subject: `Welcome to Safar Kashmir, ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Welcome to Safar Kashmir! 🏔️</h1>
        </div>
        <div style="padding: 40px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Salaam, ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for joining Safar Kashmir - your gateway to authentic Kashmiri experiences.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Whether you're looking to explore stunning houseboats, cozy homestays, or thrilling adventures,
            we're here to make your Kashmir journey unforgettable.
          </p>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/explore" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Start Exploring
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Need help? Reply to this email or visit our help center.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; background: #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Safar Kashmir. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  emailVerification: (name, verificationLink) => ({
    subject: 'Verify your email - Safar Kashmir',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 40px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Verify Your Email</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Please verify your email address to complete your Safar Kashmir account setup.
          </p>
          <div style="margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  }),

  passwordReset: (name, resetLink) => ({
    subject: 'Reset your password - Safar Kashmir',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 40px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Password Reset Request</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link expires in 1 hour. If you didn't request this, please ignore this email or contact support.
          </p>
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
