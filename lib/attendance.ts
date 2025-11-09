import { db } from './firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export interface AttendanceRecord {
  userId: string
  name: string
  email: string | null
  rehearsalId: string
  timestamp: any // Firestore serverTimestamp
  location: string
}

export async function checkIn(
  userId: string,
  name: string,
  email: string | null,
  rehearsalId: string,
  location: string
): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not initialized')
  }

  const attendanceData: Omit<AttendanceRecord, 'timestamp'> & { timestamp: any } = {
    userId,
    name,
    email,
    rehearsalId,
    location,
    timestamp: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, 'attendance'), attendanceData)
  return docRef.id
}

