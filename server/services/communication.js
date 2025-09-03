const twilio = require('twilio');
const nodemailer = require('nodemailer');

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize email transporter
const emailTransporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

/**
 * Send SMS via Twilio
 * @param {string} phoneNumber - Phone number to send SMS to
 * @param {string} message - Message content
 * @returns {Promise<boolean>} - Success status
 */
const sendSMS = async (phoneNumber, message) => {
  try {
    if (!twilioClient) {
      console.log('Twilio not configured, SMS would be sent to:', phoneNumber);
      console.log('Message:', message);
      return true; // Return true for demo purposes
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log('SMS sent successfully:', result.sid);
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error('Failed to send SMS');
  }
};

/**
 * Send email via Nodemailer
 * @param {string} email - Email address to send to
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 * @returns {Promise<boolean>} - Success status
 */
const sendEmail = async (email, subject, content) => {
  try {
    if (!emailTransporter) {
      console.log('Email not configured, email would be sent to:', email);
      console.log('Subject:', subject);
      console.log('Content:', content);
      return true; // Return true for demo purposes
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: content,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">BoomBank</h2>
          <p>${content}</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from BoomBank. Please do not reply.
          </p>
        </div>
      `
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send OTP via SMS (primary method)
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - OTP code
 * @param {string} type - OTP type (login, registration, reset)
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPSMS = async (phoneNumber, otp, type = 'verification') => {
  const message = `Your Boombank ${type} code is: ${otp}. Valid for 2 hours.`;
  return sendSMS(phoneNumber, message);
};

/**
 * Send OTP via email (fallback method)
 * @param {string} email - Email address
 * @param {string} otp - OTP code
 * @param {string} type - OTP type (login, registration, reset)
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPEmail = async (email, otp, type = 'verification') => {
  const subject = `BoomBank ${type.charAt(0).toUpperCase() + type.slice(1)} Code`;
  const content = `Your ${type} code is: ${otp}. Valid for 2 hours.`;
  return sendEmail(email, subject, content);
};

/**
 * Send welcome email to new users
 * @param {string} email - User's email
 * @param {string} fullName - User's full name
 * @returns {Promise<boolean>} - Success status
 */
const sendWelcomeEmail = async (email, fullName) => {
  const subject = 'Welcome to BoomBank!';
  const content = `
    Welcome to BoomBank, ${fullName}!
    
    Your account has been successfully created and verified.
    
    Start playing our exciting minesweeper game and test your luck!
    
    Best regards,
    The BoomBank Team
  `;
  
  return sendEmail(email, subject, content);
};

/**
 * Send password reset confirmation
 * @param {string} email - User's email
 * @param {string} fullName - User's full name
 * @returns {Promise<boolean>} - Success status
 */
const sendPasswordResetConfirmation = async (email, fullName) => {
  const subject = 'Password Reset Successful';
  const content = `
    Hello ${fullName},
    
    Your password has been successfully reset.
    
    If you did not request this change, please contact support immediately.
    
    Best regards,
    The BoomBank Team
  `;
  
  return sendEmail(email, subject, content);
};

/**
 * Send account blocked notification
 * @param {string} email - User's email
 * @param {string} fullName - User's full name
 * @param {string} reason - Reason for blocking
 * @returns {Promise<boolean>} - Success status
 */
const sendAccountBlockedNotification = async (email, fullName, reason) => {
  const subject = 'Account Blocked - Action Required';
  const content = `
    Hello ${fullName},
    
    Your BoomBank account has been blocked for the following reason:
    ${reason}
    
    Please contact support to resolve this issue.
    
    Best regards,
    The BoomBank Team
  `;
  
  return sendEmail(email, subject, content);
};

/**
 * Send large win notification
 * @param {string} email - User's email
 * @param {string} fullName - User's full name
 * @param {number} amount - Win amount
 * @returns {Promise<boolean>} - Success status
 */
const sendLargeWinNotification = async (email, fullName, amount) => {
  const subject = '🎉 Congratulations on Your Big Win!';
  const content = `
    Hello ${fullName},
    
    🎉 Congratulations! You've won $${amount.toFixed(2)} on BoomBank!
    
    This is an amazing achievement! Keep playing and good luck!
    
    Best regards,
    The BoomBank Team
  `;
  
  return sendEmail(email, subject, content);
};

module.exports = {
  sendSMS,
  sendEmail,
  sendOTPSMS,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetConfirmation,
  sendAccountBlockedNotification,
  sendLargeWinNotification
};
