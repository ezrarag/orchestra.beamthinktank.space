import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { google } from 'googleapis'

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
})

const db = getFirestore()

// Google Sheets API setup
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
})

const sheets = google.sheets({ version: 'v4', auth })

async function importFromSheets() {
  try {
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID
    
    if (!SPREADSHEET_ID) {
      console.error('GOOGLE_SHEETS_ID environment variable is required')
      console.log('Usage: GOOGLE_SHEETS_ID="your-sheet-id" npx tsx scripts/import-sheets-to-firestore.ts')
      process.exit(1)
    }

    const RANGE = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:Z'
    const projectId = process.env.PROJECT_ID || 'black-diaspora-symphony'

    console.log(`📥 Fetching data from Google Sheets (ID: ${SPREADSHEET_ID})...`)
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      console.log('❌ No data found in the spreadsheet')
      return
    }

    // First row is headers
    const headers = rows[0].map((h: string) => h.trim())
    const dataRows = rows.slice(1)

    console.log(`📊 Found ${dataRows.length} rows of data`)
    console.log(`📋 Headers: ${headers.join(', ')}`)

    // Map headers to Firestore fields
    const fieldMapping: Record<string, string> = {
      'Name': 'name',
      'Email': 'email',
      'Phone': 'phone',
      'Instrument': 'instrument',
      'Status': 'status',
      'Notes': 'notes',
      'Source': 'source',
      'Bio': 'bio',
      'Headshot URL': 'headshotUrl',
      'Media Embed URL': 'mediaEmbedUrl',
      'Support Link': 'supportLink',
    }

    const batch = db.batch()
    let importedCount = 0

    for (const row of dataRows) {
      if (!row[0] || !row[0].trim()) {
        continue // Skip empty rows
      }

      const musicianData: any = {
        projectId,
        role: 'musician',
        status: 'pending', // Default, can be overridden
        joinedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Map row data to Firestore structure
      headers.forEach((header, index) => {
        const field = fieldMapping[header]
        if (field && row[index] && row[index].trim()) {
          musicianData[field] = row[index].trim()
        }
      })

      // Normalize status values
      if (musicianData.status) {
        const statusLower = musicianData.status.toLowerCase()
        if (statusLower.includes('confirmed')) {
          musicianData.status = 'confirmed'
        } else if (statusLower.includes('interested') || statusLower.includes('pending')) {
          musicianData.status = 'pending'
        } else if (statusLower.includes('declined')) {
          musicianData.status = 'dropped'
        }
      }

      // Ensure required fields
      if (!musicianData.name) {
        console.warn(`⚠️  Skipping row without name: ${JSON.stringify(row.slice(0, 3))}`)
        continue
      }

      // Create document ID from email or name
      const docId = musicianData.email 
        ? `${musicianData.email.replace(/[^a-zA-Z0-9]/g, '_')}_${projectId}`
        : `${musicianData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${projectId}`

      const docRef = db.collection('projectMusicians').doc(docId)
      batch.set(docRef, musicianData, { merge: true })
      importedCount++
    }

    if (importedCount > 0) {
      await batch.commit()
      console.log(`✅ Successfully imported ${importedCount} musicians from Google Sheets`)
      console.log(`📁 Project ID: ${projectId}`)
      console.log(`🔥 Firestore collection: projectMusicians`)
    } else {
      console.log('⚠️  No valid rows to import')
    }

  } catch (error: any) {
    console.error('❌ Import error:', error)
    if (error.code === 403) {
      console.error('\n💡 Make sure:')
      console.error('   1. Google Sheets API is enabled in Google Cloud Console')
      console.error('   2. Service account has access to the spreadsheet')
      console.error('   3. Spreadsheet is shared with the service account email')
    }
    process.exit(1)
  }
}

importFromSheets()

