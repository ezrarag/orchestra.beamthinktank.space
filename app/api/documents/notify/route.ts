import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { documentType, musicianName, musicianEmail, downloadUrl } = await request.json()

    // Validate required fields
    if (!documentType || !musicianName || !musicianEmail || !downloadUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Email addresses to notify (Dayvin's mom, black string triage email, ezra (contractor)and Ethan)
    const recipients = [
      'momhallmon@gmail.com',
      'blackstringtriageensemble@gmail.com',
      'ezra@beamthinktank.space'
    ]

    const documentTypeNames = {
      w4: 'W-4 Employee Withholding Certificate',
      contract: 'Performance Contract',
      mediaRelease: 'Media Release Agreement'
    }

    const subject = `${documentTypeNames[documentType as keyof typeof documentTypeNames] || 'Document'} Submitted - ${musicianName}`

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
      margin-top: 20px;
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
      <h1>New Document Submission</h1>
    </div>
    <div class="content">
      <h2>Document Information</h2>
      <p><strong>Document Type:</strong> ${documentTypeNames[documentType as keyof typeof documentTypeNames] || documentType}</p>
      <p><strong>Musician Name:</strong> ${musicianName}</p>
      <p><strong>Musician Email:</strong> ${musicianEmail}</p>
      <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
      
      <p>A new ${documentTypeNames[documentType as keyof typeof documentTypeNames] || 'document'} has been submitted and is ready for review.</p>
      
      <a href="${downloadUrl}" class="button">View Document</a>
    </div>
    <div class="footer">
      <p>This is an automated email from the BEAM Orchestra Platform</p>
    </div>
  </div>
</body>
</html>
    `

    // Send email to all recipients
    await Promise.all(
      recipients.map(recipient =>
        transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@beamthinktank.space',
          to: recipient,
          subject,
          html: emailHtml,
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: 'Email notifications sent successfully',
    })
  } catch (error) {
    console.error('Error sending email notification:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

