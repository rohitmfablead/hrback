import nodemailer from 'nodemailer';

export const sendWelcomeEmail = async (email, name, employeeId, password) => {
  try {
    // Only try to send email if SMTP_USER is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ Email not sent: SMTP_USER and SMTP_PASS are not set in .env');
      console.log(`✉️ (Mock Email) To: ${email} | ID: ${employeeId} | Pass: ${password}`);
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to SmartHR! Your Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #2c3e50; text-align: center;">Welcome to SmartHR!</h2>
          <p>Dear ${name},</p>
          <p>Your employee account has been created successfully.</p>
          <p>You can use the following credentials to log in to your employee dashboard:</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
            <p style="margin: 8px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>Password:</strong> <span style="color: #d97706; font-family: monospace; font-size: 16px; font-weight: bold;">${password}</span></p>
          </div>
          
          <p>Please log in and change your password as soon as possible.</p>
          <br/>
          <p>Best regards,<br/><strong>HR Department</strong></p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};
