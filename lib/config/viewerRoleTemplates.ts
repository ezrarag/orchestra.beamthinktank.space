export type ViewerAreaId = 'professional' | 'community' | 'chamber' | 'publishing' | 'business'

export type ViewerRoleTemplate = {
  id: string
  title: string
  description: string
  order: number
}

export const DEFAULT_VIEWER_AREA_ROLE_TEMPLATES: Record<ViewerAreaId, ViewerRoleTemplate[]> = {
  professional: [
    { id: 'conductor', title: 'Conductor', description: 'Leads artistic direction and rehearsal priorities.', order: 1 },
    { id: 'concertmaster', title: 'Concertmaster', description: 'Principal violin and section leadership.', order: 2 },
    { id: 'principal-winds', title: 'Principal Winds', description: 'Principal woodwind chairs and phrasing leads.', order: 3 },
    { id: 'principal-brass', title: 'Principal Brass', description: 'Principal brass chairs and balance leads.', order: 4 },
    { id: 'principal-percussion', title: 'Principal Percussion', description: 'Percussion leadership and cue alignment.', order: 5 },
    { id: 'section-musician', title: 'Section Musician', description: 'Core orchestral section performance role.', order: 6 },
    { id: 'guest-soloist', title: 'Guest Soloist', description: 'Featured artist and concerto lead.', order: 7 },
    { id: 'orchestra-manager', title: 'Orchestra Manager', description: 'Operations, scheduling, and logistics.', order: 8 },
    { id: 'audio-video-producer', title: 'Audio/Video Producer', description: 'Capture, mix, and broadcast coordination.', order: 9 },
  ],
  community: [
    { id: 'community-conductor', title: 'Community Conductor', description: 'Directs community ensemble programming.', order: 1 },
    { id: 'teaching-artist', title: 'Teaching Artist', description: 'Leads instruction and public learning moments.', order: 2 },
    { id: 'section-leader', title: 'Section Leader', description: 'Supports ensemble readiness and peer guidance.', order: 3 },
    { id: 'student-musician', title: 'Student Musician', description: 'Performer in training and learning track.', order: 4 },
    { id: 'youth-mentor', title: 'Youth Mentor', description: 'Mentorship role for early-career participants.', order: 5 },
    { id: 'partner-coordinator', title: 'Partner Coordinator', description: 'Coordinates schools and community partners.', order: 6 },
    { id: 'volunteer-coordinator', title: 'Volunteer Coordinator', description: 'Manages community volunteer support.', order: 7 },
    { id: 'audience-advocate', title: 'Audience Advocate', description: 'Connects local audience feedback and outreach.', order: 8 },
  ],
  chamber: [
    { id: 'ensemble-lead', title: 'Ensemble Lead', description: 'Coordinates interpretation and artistic decisions.', order: 1 },
    { id: 'chamber-coach', title: 'Chamber Coach', description: 'Supports rehearsal detail and development.', order: 2 },
    { id: 'string-artist', title: 'String Artist', description: 'Violin/viola/cello performance seat.', order: 3 },
    { id: 'keyboard-continuo', title: 'Keyboard/Continuo', description: 'Piano or continuo realization role.', order: 4 },
    { id: 'guest-artist', title: 'Guest Artist', description: 'Rotating specialist collaborator.', order: 5 },
    { id: 'recording-engineer', title: 'Recording Engineer', description: 'Session capture and technical setup.', order: 6 },
    { id: 'editor', title: 'Editor', description: 'Post-production edit and assembly.', order: 7 },
  ],
  publishing: [
    { id: 'composer', title: 'Composer', description: 'Original work creation and revision.', order: 1 },
    { id: 'arranger', title: 'Arranger', description: 'Adapts material for target ensemble.', order: 2 },
    { id: 'orchestrator', title: 'Orchestrator', description: 'Distributes musical material across instrumentation.', order: 3 },
    { id: 'copyist', title: 'Copyist', description: 'Prepares parts and notation delivery.', order: 4 },
    { id: 'scholar-editor', title: 'Scholar/Editor', description: 'Annotations, references, and scholarly framing.', order: 5 },
    { id: 'rights-licensing', title: 'Rights & Licensing', description: 'Permissions, rights, and release compliance.', order: 6 },
    { id: 'narrative-producer', title: 'Narrative Producer', description: 'Connects score context to story presentation.', order: 7 },
  ],
  business: [
    { id: 'executive-producer', title: 'Executive Producer', description: 'Program accountability and strategic scope.', order: 1 },
    { id: 'program-director', title: 'Program Director', description: 'Season planning and delivery governance.', order: 2 },
    { id: 'partnerships-manager', title: 'Partnerships Manager', description: 'Institution and sponsor relationship owner.', order: 3 },
    { id: 'development-lead', title: 'Development Lead', description: 'Funding pipeline and advancement initiatives.', order: 4 },
    { id: 'marketing-lead', title: 'Marketing Lead', description: 'Audience growth and communications strategy.', order: 5 },
    { id: 'operations-manager', title: 'Operations Manager', description: 'Execution workflows, staffing, and logistics.', order: 6 },
    { id: 'impact-analyst', title: 'Impact Analyst', description: 'Research metrics, reporting, and outcome tracking.', order: 7 },
  ],
}
