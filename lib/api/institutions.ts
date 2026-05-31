import type { User } from 'firebase/auth'
import {
  collection,
  type DocumentData,
  doc,
  getDoc,
  getDocs,
  type Query,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  InstitutionAccount,
  InstitutionAccountStatus,
  InstitutionContact,
  InstitutionDashboardData,
  InstitutionMilestone,
  InstitutionProject,
  InstitutionProjectStatus,
} from '@/lib/types/institution'

export const INSTITUTION_ACCOUNTS_COLLECTION = 'institutionAccounts'
export const INSTITUTION_PROJECTS_COLLECTION = 'institutionProjects'

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function normalizeEmail(value: unknown): string {
  return normalizeString(value).toLowerCase()
}

function normalizeContacts(value: unknown): InstitutionContact[] {
  if (!Array.isArray(value)) return []

  return value.reduce<InstitutionContact[]>((contacts, item) => {
    const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const name = normalizeString(entry.name)
    const email = normalizeEmail(entry.email)
    if (!name && !email) return contacts

    const role = normalizeString(entry.role)
    const phone = normalizeString(entry.phone)
    contacts.push({
      name: name || email,
      email,
      ...(role ? { role } : {}),
      ...(phone ? { phone } : {}),
    })
    return contacts
  }, [])
}

function normalizeMilestones(value: unknown): InstitutionMilestone[] {
  if (!Array.isArray(value)) return []

  return value.reduce<InstitutionMilestone[]>((milestones, item) => {
    const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const label = normalizeString(entry.label)
    if (!label) return milestones
    const rawStatus = normalizeString(entry.status)
    const status: InstitutionMilestone['status'] =
      rawStatus === 'complete' || rawStatus === 'in_progress' || rawStatus === 'pending'
        ? rawStatus
        : 'pending'
    const dueDate = normalizeString(entry.dueDate)

    milestones.push({
      label,
      status,
      ...(dueDate ? { dueDate } : {}),
    })
    return milestones
  }, [])
}

function normalizeAccountStatus(value: unknown): InstitutionAccountStatus {
  const status = normalizeString(value)
  if (status === 'active' || status === 'paused' || status === 'pending') return status
  return 'pending'
}

function normalizeProjectStatus(value: unknown): InstitutionProjectStatus {
  const status = normalizeString(value)
  if (status === 'planning' || status === 'active' || status === 'completed' || status === 'paused') return status
  return 'planning'
}

function normalizeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function normalizeInstitutionAccount(id: string, data: Record<string, unknown>): InstitutionAccount {
  const type = normalizeString(data.type)

  return {
    id,
    name: normalizeString(data.name) || id,
    shortName: normalizeString(data.shortName) || normalizeString(data.name) || id,
    status: normalizeAccountStatus(data.status),
    type:
      type === 'school' || type === 'venue' || type === 'nonprofit' || type === 'partner' || type === 'other'
        ? type
        : 'partner',
    city: normalizeString(data.city) || undefined,
    state: normalizeString(data.state) || undefined,
    website: normalizeString(data.website) || undefined,
    contactEmails: normalizeStringArray(data.contactEmails).map((email) => email.toLowerCase()),
    emailDomains: normalizeStringArray(data.emailDomains).map((domain) => domain.toLowerCase()),
    userIds: normalizeStringArray(data.userIds),
    projectIds: normalizeStringArray(data.projectIds),
    contacts: normalizeContacts(data.contacts),
    dashboardSummary: normalizeString(data.dashboardSummary) || undefined,
    notes: normalizeString(data.notes) || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function normalizeInstitutionProject(id: string, data: Record<string, unknown>): InstitutionProject {
  return {
    id,
    institutionId: normalizeString(data.institutionId),
    projectId: normalizeString(data.projectId) || 'black-diaspora-symphony',
    title: normalizeString(data.title) || id,
    status: normalizeProjectStatus(data.status),
    summary: normalizeString(data.summary),
    location: normalizeString(data.location) || undefined,
    performanceDate: normalizeString(data.performanceDate) || undefined,
    rehearsalWindow: normalizeString(data.rehearsalWindow) || undefined,
    rosterTarget: normalizeNumber(data.rosterTarget),
    confirmedMusicians: normalizeNumber(data.confirmedMusicians),
    prospectCount: normalizeNumber(data.prospectCount),
    mediaCount: normalizeNumber(data.mediaCount),
    nextActions: normalizeStringArray(data.nextActions),
    programHighlights: normalizeStringArray(data.programHighlights),
    milestones: normalizeMilestones(data.milestones),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function fetchInstitutionDashboardForUser(user: User): Promise<InstitutionDashboardData> {
  if (!db) {
    throw new Error('Institution dashboard is not initialized.')
  }

  const accountsById = new Map<string, InstitutionAccount>()
  const accountsRef = collection(db, INSTITUTION_ACCOUNTS_COLLECTION)
  const normalizedEmail = normalizeEmail(user.email)
  const accountQueries = [
    query(accountsRef, where('userIds', 'array-contains', user.uid)),
    normalizedEmail ? query(accountsRef, where('contactEmails', 'array-contains', normalizedEmail)) : null,
  ].filter((item): item is Query<DocumentData> => Boolean(item))

  for (const accountQuery of accountQueries) {
    const snapshot = await getDocs(accountQuery)
    snapshot.docs.forEach((docSnap) => {
      accountsById.set(docSnap.id, normalizeInstitutionAccount(docSnap.id, docSnap.data()))
    })
  }

  const accounts = Array.from(accountsById.values()).sort((a, b) => a.name.localeCompare(b.name))
  if (accounts.length === 0) {
    return { accounts: [], projects: [] }
  }

  const projectsById = new Map<string, InstitutionProject>()
  const projectsRef = collection(db, INSTITUTION_PROJECTS_COLLECTION)

  for (const account of accounts) {
    const snapshot = await getDocs(query(projectsRef, where('institutionId', '==', account.id)))
    snapshot.docs.forEach((docSnap) => {
      projectsById.set(docSnap.id, normalizeInstitutionProject(docSnap.id, docSnap.data()))
    })

    for (const projectDocId of account.projectIds) {
      const projectSnap = await getDoc(doc(db, INSTITUTION_PROJECTS_COLLECTION, projectDocId))
      if (projectSnap.exists()) {
        projectsById.set(projectSnap.id, normalizeInstitutionProject(projectSnap.id, projectSnap.data()))
      }
    }
  }

  const projects = Array.from(projectsById.values()).sort((a, b) => a.title.localeCompare(b.title))
  return { accounts, projects }
}

export async function upsertInstitutionAccount(account: InstitutionAccount): Promise<void> {
  if (!db) {
    throw new Error('Institution account service is not initialized.')
  }

  await setDoc(
    doc(db, INSTITUTION_ACCOUNTS_COLLECTION, account.id),
    {
      ...account,
      contactEmails: account.contactEmails.map((email) => email.toLowerCase()),
      emailDomains: account.emailDomains.map((domain) => domain.toLowerCase()),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function upsertInstitutionProject(project: InstitutionProject): Promise<void> {
  if (!db) {
    throw new Error('Institution project service is not initialized.')
  }

  await setDoc(
    doc(db, INSTITUTION_PROJECTS_COLLECTION, project.id),
    {
      ...project,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
