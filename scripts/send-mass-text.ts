/**
 * Mass Text Sender Script
 * 
 * This script allows you to send mass text messages to multiple phone numbers
 * from your phone number (4049739860).
 * 
 * Usage:
 * 1. Add phone numbers and carriers to the `recipients` array below
 * 2. Customize the message
 * 3. Run: npx tsx scripts/send-mass-text.ts
 * 
 * Supported carriers: att, tmobile, verizon, sprint, googlefi, uscellular, cricket, boost, metropcs
 */

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

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Your phone number (sender)
const YOUR_PHONE = '4049739860'
const YOUR_CARRIER = 'att' // Change this to your carrier if different

// Recipients: Add phone numbers and carriers here
// Format: { phone: '10digits', carrier: 'carrier_name', name: 'Optional Name' }
const recipients = [
  // Example entries - replace with actual phone numbers:
  // { phone: '4145551234', carrier: 'verizon', name: 'John Doe' },
  // { phone: '2623799371', carrier: 'tmobile', name: 'Jane Smith' },
  // Add more recipients here...
]

// Customize your message here
const MESSAGE = `Hi! This is a test message from BEAM Orchestra. Please confirm receipt.`

interface Recipient {
  phone: string
  carrier: string
  name?: string
}

async function sendMassText(recipients: Recipient[], message: string) {
  console.log(`\n📱 Starting mass text send to ${recipients.length} recipients...\n`)
  
  let successCount = 0
  let errorCount = 0
  const errors: Array<{ phone: string; error: string }> = []

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    const cleanPhone = recipient.phone.replace(/\D/g, '')
    
    if (cleanPhone.length !== 10) {
      console.log(`❌ ${recipient.phone}: Invalid phone number (must be 10 digits)`)
      errorCount++
      errors.push({ phone: recipient.phone, error: 'Invalid phone number format' })
      continue
    }

    const gateway = CARRIER_GATEWAYS[recipient.carrier.toLowerCase()]
    if (!gateway) {
      console.log(`❌ ${recipient.phone}: Unknown carrier "${recipient.carrier}"`)
      errorCount++
      errors.push({ phone: recipient.phone, error: `Unknown carrier: ${recipient.carrier}` })
      continue
    }

    const recipientEmail = `${cleanPhone}${gateway}`
    const personalizedMessage = recipient.name 
      ? `Hi ${recipient.name}, ${message}`
      : message

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@beamthinktank.space',
        to: recipientEmail,
        subject: 'BEAM Orchestra',
        text: personalizedMessage,
        html: `<p>${personalizedMessage}</p>`,
      })

      console.log(`✅ Sent to ${recipient.name || cleanPhone} (${cleanPhone}) via ${recipient.carrier}`)
      successCount++

      // Small delay to avoid rate limiting (300ms between messages)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    } catch (error) {
      console.log(`❌ Failed to send to ${recipient.phone}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      errorCount++
      errors.push({ 
        phone: recipient.phone, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors:`)
    errors.forEach(({ phone, error }) => {
      console.log(`   ${phone}: ${error}`)
    })
  }
}

// Run the script
if (recipients.length === 0) {
  console.log('⚠️  No recipients found!')
  console.log('Please add phone numbers to the `recipients` array in this script.')
  console.log('\nExample format:')
  console.log('const recipients = [')
  console.log('  { phone: "4145551234", carrier: "verizon", name: "John Doe" },')
  console.log('  { phone: "2623799371", carrier: "tmobile", name: "Jane Smith" },')
  console.log(']')
  process.exit(1)
}

sendMassText(recipients, MESSAGE)
  .then(() => {
    console.log('\n✨ Mass text send completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })


