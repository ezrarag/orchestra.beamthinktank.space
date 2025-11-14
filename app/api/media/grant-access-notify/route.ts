import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Carrier email gateways for SMS
const CARRIER_GATEWAYS: Record<string, string> = {
  att: '@txt.att.net',
  tmobile: '@tmomail.net',
  verizon: '@vtext.com',
  sprint: '@messaging.sprintpcs.com',
  googlefi: '@msg.fi.google.com',
  uscellular: '@email.uscc.net',
  cricket: '@sms.cricketwireless.net',
  boost: '@smsmyboostmobile.com',
  metropcs: '@mymetropcs.com'
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { identifier, identifierType, role, projectId, projectName } = await request.json()

    if (!identifier || !identifierType || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://orchestra.beamthinktank.space'
    const mediaUrl = `${baseUrl}/projects/${projectId}/media`
    const projectUrl = projectId === 'black-diaspora-symphony' 
      ? `${baseUrl}/training/contract-projects/black-diaspora-symphony`
      : `${baseUrl}/projects/${projectId}`

    const roleDescriptions: Record<string, string> = {
      musician: 'Musician',
      board: 'Board Member',
      public: 'Public Access'
    }

    const roleDescription = roleDescriptions[role] || role

    // Email notification
    if (identifierType === 'email') {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background-color: white;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 5px;
    }
    .button-secondary {
      display: inline-block;
      padding: 12px 24px;
      background: #f0f0f0;
      color: #333;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 5px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎻 Media Access Granted</h1>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>You've been granted <strong>${roleDescription}</strong> access to the ${projectName || 'Black Diaspora Symphony Orchestra'} project media library.</p>
      
      <p>You can now access:</p>
      <ul>
        <li>Rehearsal footage and videos</li>
        <li>Performance recordings</li>
        <li>Project materials and resources</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${mediaUrl}" class="button">View Media Library</a>
        <a href="${projectUrl}" class="button-secondary">View Project</a>
      </div>

      <h3>How to Access:</h3>
      <p>You can sign in using:</p>
      <ul>
        <li><strong>Google Sign-In:</strong> Click "Sign in with Google" on any page</li>
        <li><strong>Email:</strong> Use your email address (${identifier}) to sign in</li>
        <li><strong>SMS:</strong> If you provided a phone number, you can sign in via SMS</li>
      </ul>

      <p>Once signed in, visit the <a href="${mediaUrl}">Media Library</a> to view all available content.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from BEAM Orchestra Platform</p>
      <p>If you have questions, please contact the project administrator.</p>
    </div>
  </div>
</body>
</html>
      `

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@beamthinktank.space',
        to: identifier,
        subject: `Media Access Granted - ${projectName || 'Black Diaspora Symphony Orchestra'}`,
        html: emailHtml,
      })

      return NextResponse.json({ success: true, method: 'email' })
    }

    // SMS notification (if phone number provided)
    if (identifierType === 'phone') {
      // Note: For SMS, we'd need to know the carrier. For now, we'll try common carriers
      // In a production system, you'd store carrier info or ask the user
      const cleanPhone = identifier.replace(/\D/g, '')
      const message = `You've been granted ${roleDescription} access to ${projectName || 'BEAM Orchestra'} media! View: ${mediaUrl} Sign in with Google, email, or SMS.`

      // Try sending to common carriers (you might want to store carrier info)
      // For now, we'll just return success - actual SMS would require carrier info
      return NextResponse.json({ 
        success: true, 
        method: 'sms',
        message: 'SMS notification would be sent if carrier information was available. Please notify the user manually or add carrier information to enable SMS notifications.'
      })
    }

    // Name-based - can't send notification without email/phone
    return NextResponse.json({ 
      success: false, 
      error: 'Cannot send notification for name-based access. Please provide email or phone number.' 
    })

  } catch (error: any) {
    console.error('Error sending access notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    )
  }
}

