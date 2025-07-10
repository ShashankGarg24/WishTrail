const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // Configuration for different environments
    const config = {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
    };

    this.transporter = nodemailer.createTransport(config);

    // Verify transporter configuration
    if (this.transporter) {
      try {
        await this.transporter.verify();
        console.log('Email service is ready');
      } catch (error) {
        console.error('Email service configuration error:', error.message);
      }
    }
  }

  /**
   * Send OTP email for signup verification
   */
  async sendOTPEmail(email, code, purpose = 'signup') {
    const templates = {
      signup: {
        subject: 'Verify your WishTrail Account',
        html: this.getSignupOTPTemplate(code),
        text: `Welcome to WishTrail! Your verification code is: ${code}. This code will expire in 10 minutes.`
      },
      login: {
        subject: 'WishTrail Login Verification',
        html: this.getLoginOTPTemplate(code),
        text: `Your WishTrail login verification code is: ${code}. This code will expire in 10 minutes.`
      },
      password_reset: {
        subject: 'Reset Your WishTrail Password',
        html: this.getPasswordResetOTPTemplate(code),
        text: `Your password reset verification code is: ${code}. This code will expire in 10 minutes.`
      }
    };

    const template = templates[purpose] || templates.signup;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'WishTrail <noreply@wishtrail.com>',
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html
    };

    try {
      if (!this.transporter) {
        throw new Error('Email service is not configured');
      }

      const info = await this.transporter.sendMail(mailOptions);
      
      // Log the result for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('Email sent successfully:', info.messageId);
        if (info.previewUrl) {
          console.log('Preview URL:', info.previewUrl);
        }
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: info.previewUrl
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Get HTML template for signup OTP
   */
  getSignupOTPTemplate(code) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your WishTrail Account</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 10px;
          color: white;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin: 20px 0;
          color: #333;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #667eea;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          margin-top: 20px;
        }
        .highlight {
          color: #667eea;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎯 WishTrail</div>
        <h1>Welcome to WishTrail!</h1>
        <p>Transform your dreams into achievable goals</p>
      </div>
      
      <div class="content">
        <h2>Verify Your Account</h2>
        <p>Thank you for joining WishTrail! To complete your registration, please use the verification code below:</p>
        
        <div class="otp-code">${code}</div>
        
        <p>This code will expire in <span class="highlight">10 minutes</span>.</p>
        
        <p>If you didn't request this verification, please ignore this email.</p>
        
        <p>Need help? Reply to this email or contact our support team.</p>
      </div>
      
      <div class="footer">
        <p>© 2024 WishTrail. All rights reserved.</p>
        <p>Dreams. Goals. Progress.</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Get HTML template for login OTP
   */
  getLoginOTPTemplate(code) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WishTrail Login Verification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 10px;
          color: white;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin: 20px 0;
          color: #333;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #667eea;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          margin-top: 20px;
        }
        .highlight {
          color: #667eea;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎯 WishTrail</div>
        <h1>Login Verification</h1>
      </div>
      
      <div class="content">
        <h2>Verify Your Login</h2>
        <p>Please use the verification code below to complete your login:</p>
        
        <div class="otp-code">${code}</div>
        
        <p>This code will expire in <span class="highlight">10 minutes</span>.</p>
        
        <p>If you didn't request this login, please secure your account immediately.</p>
      </div>
      
      <div class="footer">
        <p>© 2024 WishTrail. All rights reserved.</p>
        <p>Dreams. Goals. Progress.</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Get HTML template for password reset OTP
   */
  getPasswordResetOTPTemplate(code) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your WishTrail Password</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 10px;
          color: white;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin: 20px 0;
          color: #333;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #667eea;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          margin-top: 20px;
        }
        .highlight {
          color: #667eea;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎯 WishTrail</div>
        <h1>Password Reset</h1>
      </div>
      
      <div class="content">
        <h2>Reset Your Password</h2>
        <p>You requested to reset your password. Please use the verification code below:</p>
        
        <div class="otp-code">${code}</div>
        
        <p>This code will expire in <span class="highlight">10 minutes</span>.</p>
        
        <p>If you didn't request this password reset, please ignore this email and secure your account.</p>
      </div>
      
      <div class="footer">
        <p>© 2024 WishTrail. All rights reserved.</p>
        <p>Dreams. Goals. Progress.</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'WishTrail <noreply@wishtrail.com>',
      to: email,
      subject: 'Welcome to WishTrail! 🎉',
      html: this.getWelcomeTemplate(name),
      text: `Welcome to WishTrail, ${name}! Start setting your goals and track your progress. Visit your dashboard to get started.`
    };

    try {
      if (!this.transporter) {
        throw new Error('Email service is not configured');
      }

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error for welcome emails - they're not critical
      return { success: false, error: error.message };
    }
  }

  /**
   * Get HTML template for welcome email
   */
  getWelcomeTemplate(name) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to WishTrail</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 10px;
          color: white;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          margin: 20px 0;
          color: #333;
        }
        .cta-button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          font-size: 14px;
          color: #666;
          margin-top: 20px;
        }
        .highlight {
          color: #667eea;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎯 WishTrail</div>
        <h1>Welcome to WishTrail!</h1>
        <p>Transform your dreams into achievable goals</p>
      </div>
      
      <div class="content">
        <h2>Welcome, ${name}! 🎉</h2>
        <p>Congratulations on joining WishTrail! You're now part of a community dedicated to turning dreams into reality.</p>
        
        <p>Here's what you can do next:</p>
        <ul>
          <li><strong>Set your first goal:</strong> Start by creating a meaningful goal that matters to you</li>
          <li><strong>Track your progress:</strong> Update your goals regularly and celebrate small wins</li>
          <li><strong>Connect with others:</strong> Find inspiration from the community and share your journey</li>
          <li><strong>Complete your profile:</strong> Add your interests and preferences to get personalized recommendations</li>
        </ul>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
            Start Your Journey
          </a>
        </div>
        
        <p>Remember, every big achievement starts with a single step. You've already taken yours by joining WishTrail!</p>
      </div>
      
      <div class="footer">
        <p>© 2024 WishTrail. All rights reserved.</p>
        <p>Dreams. Goals. Progress.</p>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();