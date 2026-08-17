import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getProfiles } from '@/lib/profiles'
import type { Profile } from '@/lib/types/profile'

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const isAllowedOrigin =
    origin.endsWith('.beamthinktank.space') ||
    origin.startsWith('http://localhost:') ||
    origin === 'https://beamthinktank.space'

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

const RATES = {
  airfare: 350,
  housing: 450, // 3 nights @ $150
  meals: 135,   // 3 days @ $45
}

type CityAggregation = {
  city: string
  registeredParticipants: number
  supportRequests: number
  housingNeeded: number
  flightsTransportNeeded: number
  mealsPerDiemNeeded: number
  estimatedCitySupportDeltaUSD: number
}

type PipelineAggregation = {
  pipelineSource: string
  registeredParticipants: number
  supportRequests: number
  housingNeeded: number
  flightsTransportNeeded: number
  mealsPerDiemNeeded: number
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request)

  try {
    let profilesList: Profile[] = []

    // 1. Prefer Admin SDK if initialized server-side
    if (adminDb) {
      const snapshot = await adminDb.collection('profiles').get()
      profilesList = snapshot.docs.map((doc) => {
        const data = doc.data()
        const rawInfra = data.infrastructure_needs || data.infrastructureNeeds
        const infra = rawInfra && typeof rawInfra === 'object' ? {
          housing: Boolean(rawInfra.housing),
          flights_transport: Boolean(rawInfra.flights_transport ?? rawInfra.flightsTransport),
          flightsTransport: Boolean(rawInfra.flightsTransport ?? rawInfra.flights_transport),
          meals_per_diem: Boolean(rawInfra.meals_per_diem ?? rawInfra.mealsPerDiem),
          mealsPerDiem: Boolean(rawInfra.mealsPerDiem ?? rawInfra.meals_per_diem),
          equipment_details: rawInfra.equipment_details || rawInfra.equipmentDetails || undefined,
        } : undefined

        return {
          id: doc.id,
          name: String(data.name ?? ''),
          location: String(data.location ?? ''),
          city_state: data.city_state ? String(data.city_state) : data.cityState ? String(data.cityState) : undefined,
          cityState: data.cityState ? String(data.cityState) : data.city_state ? String(data.city_state) : undefined,
          contact: String(data.contact ?? ''),
          email: data.email ? String(data.email) : undefined,
          types: Array.isArray(data.types) ? data.types : ['musician'],
          instrument: data.instrument ? String(data.instrument) : undefined,
          section: data.section ? String(data.section) : undefined,
          willingness_to_travel: typeof data.willingness_to_travel === 'boolean' ? data.willingness_to_travel : typeof data.willingnessToTravel === 'boolean' ? data.willingnessToTravel : undefined,
          pipeline_source: data.pipeline_source ? String(data.pipeline_source) : data.pipelineSource ? String(data.pipelineSource) : undefined,
          infrastructure_needs: infra,
          infrastructureNeeds: infra,
        } as Profile
      })
    } else {
      // Fallback client SDK getProfiles()
      profilesList = await getProfiles()
    }

    // Filter candidate profiles
    const candidateProfiles = profilesList.filter((p) => (p.types || []).includes('musician') || p.instrument)

    let totalRegisteredParticipants = candidateProfiles.length
    let totalActiveSupportRequests = 0
    let willingnessToTravelCount = 0

    let housingNeededTotal = 0
    let flightsTransportNeededTotal = 0
    let mealsPerDiemNeededTotal = 0
    let estimatedNetworkSupportDeltaUSD = 0

    const cityMap: Record<string, CityAggregation> = {}
    const pipelineMap: Record<string, PipelineAggregation> = {}

    for (const p of candidateProfiles) {
      const cityKey = (p.city_state || p.location || 'Unknown').trim()
      const pipelineKey = (p.pipeline_source || p.pipelineSource || 'BEAM Talent Pipeline').trim()

      const willing = typeof p.willingness_to_travel === 'boolean' ? p.willingness_to_travel : p.willingnessToTravel
      if (willing) willingnessToTravelCount++

      const infra = p.infrastructure_needs || p.infrastructureNeeds
      const needsHousing = Boolean(infra?.housing)
      const needsFlights = Boolean(infra?.flights_transport || infra?.flightsTransport)
      const needsMeals = Boolean(infra?.meals_per_diem || infra?.mealsPerDiem)

      const hasAnySupportRequest = needsHousing || needsFlights || needsMeals
      if (hasAnySupportRequest) {
        totalActiveSupportRequests++
      }

      let candidateDelta = 0
      if (needsFlights) {
        flightsTransportNeededTotal++
        candidateDelta += RATES.airfare
      }
      if (needsHousing) {
        housingNeededTotal++
        candidateDelta += RATES.housing
      }
      if (needsMeals) {
        mealsPerDiemNeededTotal++
        candidateDelta += RATES.meals
      }

      estimatedNetworkSupportDeltaUSD += candidateDelta

      // City aggregation
      if (!cityMap[cityKey]) {
        cityMap[cityKey] = {
          city: cityKey,
          registeredParticipants: 0,
          supportRequests: 0,
          housingNeeded: 0,
          flightsTransportNeeded: 0,
          mealsPerDiemNeeded: 0,
          estimatedCitySupportDeltaUSD: 0,
        }
      }

      cityMap[cityKey].registeredParticipants++
      if (hasAnySupportRequest) cityMap[cityKey].supportRequests++
      if (needsHousing) cityMap[cityKey].housingNeeded++
      if (needsFlights) cityMap[cityKey].flightsTransportNeeded++
      if (needsMeals) cityMap[cityKey].mealsPerDiemNeeded++
      cityMap[cityKey].estimatedCitySupportDeltaUSD += candidateDelta

      // Pipeline aggregation
      if (!pipelineMap[pipelineKey]) {
        pipelineMap[pipelineKey] = {
          pipelineSource: pipelineKey,
          registeredParticipants: 0,
          supportRequests: 0,
          housingNeeded: 0,
          flightsTransportNeeded: 0,
          mealsPerDiemNeeded: 0,
        }
      }

      pipelineMap[pipelineKey].registeredParticipants++
      if (hasAnySupportRequest) pipelineMap[pipelineKey].supportRequests++
      if (needsHousing) pipelineMap[pipelineKey].housingNeeded++
      if (needsFlights) pipelineMap[pipelineKey].flightsTransportNeeded++
      if (needsMeals) pipelineMap[pipelineKey].mealsPerDiemNeeded++
    }

    const byCity = Object.values(cityMap).sort((a, b) => b.registeredParticipants - a.registeredParticipants)
    const byPipelineSource = Object.values(pipelineMap).sort((a, b) => b.registeredParticipants - a.registeredParticipants)

    return NextResponse.json(
      {
        status: 'success',
        timestamp: new Date().toISOString(),
        networkSummary: {
          totalRegisteredParticipants,
          totalActiveSupportRequests,
          willingnessToTravelCount,
          totalsByNeed: {
            housingNeeded: housingNeededTotal,
            flightsTransportNeeded: flightsTransportNeededTotal,
            mealsPerDiemNeeded: mealsPerDiemNeededTotal,
          },
          estimatedNetworkSupportDeltaUSD,
        },
        byCity,
        byPipelineSource,
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error serving network-needs API:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to aggregate network support needs.',
        details: error?.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
