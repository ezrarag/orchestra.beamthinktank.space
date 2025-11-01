import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Email transporter (same config as document emails)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Admin email addresses
const ADMIN_EMAILS = [
  'momhallmon@gmail.com', // Dayvin's mom
  'ezra@beamthinktank.space', // Ezra
  'blackstringtriageensemble@gmail.com' // Black String Triage
]

interface RehearsalData {
  date: string
  time: string
  location: string
  type: string
}

interface MusicianData {
  instrument: string
  status: string
  name: string
}

interface ProspectData {
  name: string
  instrument: string | null
  status: string
  email: string | null
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId') || 'black-diaspora-symphony'
    
    // In production, fetch from Firestore
    // For now, using mock data structure
    const mockRehearsals: RehearsalData[] = [
      { date: '2025-11-09', time: '7:00 PM', location: 'Central United Methodist Church', type: 'Full Orchestra' },
      { date: '2025-11-16', time: '7:00 PM', location: 'Central United Methodist Church', type: 'Full Orchestra' },
      { date: '2025-11-22', time: '7:00 PM', location: 'Central United Methodist Church', type: 'Full Orchestra' },
    ]

    const mockMusicians: MusicianData[] = [
      { instrument: 'Violin I', status: 'confirmed', name: 'Yolanda Odufuwa' },
      { instrument: 'Viola', status: 'confirmed', name: 'Nicole Gabriel' },
      { instrument: 'Viola', status: 'confirmed', name: 'Ezra Haugabrooks' },
      { instrument: 'Horn', status: 'confirmed', name: 'Maya Schiek' },
    ]

    const mockProspects: ProspectData[] = [
      { name: 'Churchill Caruthers Jr', instrument: 'Violin I', status: 'pending', email: 'churchillcaruthers@gmail.com' },
      { name: 'Dave Rasmussen', instrument: 'Violin II', status: 'pending', email: 'damtalldave@gmail.com' },
    ]

    // Determine missing instruments (simplified - in production, fetch from Firestore)
    const instrumentRequirements: Record<string, number> = {
      'Violin I': 6,
      'Violin II': 6,
      'Viola': 6,
      'Cello': 4,
      'Bass': 3,
      'Flute': 2,
      'Oboe': 2,
      'Clarinet': 2,
      'Bassoon': 2,
      'Horn': 4,
      'Trumpet': 3,
      'Trombone': 3,
      'Tuba': 1,
      'Harp': 1,
      'Timpani': 1,
      'Percussion': 2,
    }

    const confirmedByInstrument: Record<string, number> = {}
    mockMusicians.forEach(m => {
      if (m.status === 'confirmed') {
        confirmedByInstrument[m.instrument] = (confirmedByInstrument[m.instrument] || 0) + 1
      }
    })

    const missingInstruments = Object.entries(instrumentRequirements)
      .filter(([instrument, needed]) => (confirmedByInstrument[instrument] || 0) < needed)
      .map(([instrument, needed]) => ({
        instrument,
        needed,
        confirmed: confirmedByInstrument[instrument] || 0,
        remaining: needed - (confirmedByInstrument[instrument] || 0)
      }))

    // Generate summary with OpenAI
    const summaryPrompt = `Summarize the following information about the Black Diaspora Symphony Orchestra project:

Current Roster:
- ${mockMusicians.filter(m => m.status === 'confirmed').length} confirmed musicians
- Missing instruments: ${missingInstruments.map(m => `${m.instrument} (${m.remaining} needed)`).join(', ')}

Upcoming Rehearsals:
${mockRehearsals.map(r => `- ${r.date} at ${r.time} (${r.type})`).join('\n')}

Pending Invites:
- ${mockProspects.filter(p => p.status === 'pending').length} unread invites
${mockProspects.filter(p => p.status === 'pending').slice(0, 5).map(p => `  - ${p.name} (${p.instrument || 'TBD'})`).join('\n')}

Create a concise, professional daily summary email (2-3 paragraphs) highlighting key action items and progress.`

    let aiSummary = ''
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a project management assistant for a community orchestra. Create concise, actionable daily summaries.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        max_tokens: 500
      })

      aiSummary = completion.choices[0].message.content || 'Summary generation failed.'
    } catch (error) {
      console.error('OpenAI API error:', error)
      // Fallback summary
      aiSummary = `Daily Summary for ${projectId}:

Current Status:
- ${mockMusicians.filter(m => m.status === 'confirmed').length} confirmed musicians out of target roster
- ${missingInstruments.length} instrument sections need more musicians

Upcoming Rehearsals:
${mockRehearsals.map(r => `- ${r.date} at ${r.time}: ${r.type}`).join('\n')}

Action Items:
- ${mockProspects.filter(p => p.status === 'pending').length} pending invites need follow-up
- Priority instruments to fill: ${missingInstruments.slice(0, 3).map(m => m.instrument).join(', ')}`
    }

    // Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .section {
      margin-bottom: 25px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .section h3 {
      margin-top: 0;
      color: #667eea;
    }
    .stat {
      display: inline-block;
      margin: 5px 10px 5px 0;
      padding: 5px 10px;
      background: #f0f0f0;
      border-radius: 4px;
      font-weight: bold;
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
  <div class="header">
    <h1>🎻 BEAM Orchestra Daily Summary</h1>
    <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  <div class="content">
    <div class="section">
      <h3>📊 Project Overview</h3>
      <p>${aiSummary.split('\n').slice(0, 3).join('<br>')}</p>
      <div>
        <span class="stat">Confirmed: ${mockMusicians.filter(m => m.status === 'confirmed').length}</span>
        <span class="stat">Pending: ${mockProspects.filter(p => p.status === 'pending').length}</span>
        <span class="stat">Missing Sections: ${missingInstruments.length}</span>
      </div>
    </div>

    <div class="section">
      <h3>📅 Upcoming Rehearsals</h3>
      <ul>
        ${mockRehearsals.map(r => `<li><strong>${r.date}</strong> at ${r.time} - ${r.type} at ${r.location}</li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h3>⚠️ Missing Instruments</h3>
      <ul>
        ${missingInstruments.slice(0, 10).map(m => `<li><strong>${m.instrument}</strong>: ${m.confirmed}/${m.needed} (${m.remaining} needed)</li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h3>📧 Pending Invites</h3>
      <p>${mockProspects.filter(p => p.status === 'pending').length} invites awaiting response:</p>
      <ul>
        ${mockProspects.filter(p => p.status === 'pending').slice(0, 5).map(p => `<li>${p.name} - ${p.instrument || 'TBD'}</li>`).join('')}
      </ul>
    </div>
  </div>
  <div class="footer">
    <p>This is an automated daily summary from BEAM Orchestra Platform</p>
    <p>Visit <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://beamthinktank.space'}/admin/dashboard">Admin Dashboard</a> for more details</p>
  </div>
</body>
</html>
    `

    // Send email to admins
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@beamthinktank.space',
        to: ADMIN_EMAILS.join(', '),
        subject: `BEAM Orchestra Daily Summary - ${new Date().toLocaleDateString()}`,
        html: emailHtml,
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Daily summary email sent successfully',
        recipients: ADMIN_EMAILS 
      })
    } catch (emailError) {
      console.error('Email send error:', emailError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send email',
        summary: aiSummary 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Pulse summary error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

