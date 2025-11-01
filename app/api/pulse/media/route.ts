import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId') || 'black-diaspora-symphony'

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured, returning mock data')
      return NextResponse.json({
        success: true,
        items: [
          {
            title: 'Black Diaspora Symphony Orchestra - 2024 Juneteenth Concert',
            description: 'Performance highlights from the 2024 Juneteenth Concert featuring works celebrating Black musical tradition.',
            url: 'https://www.youtube.com/watch?v=example',
            source: 'YouTube',
            thumbnail: null,
            type: 'video',
            mediaType: 'video'
          }
        ]
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost savings, can switch to gpt-4o for better results
      messages: [
        {
          role: 'system',
          content: `You are a media aggregator for the BEAM Orchestra project ${projectId}. 
          Return JSON containing recent videos, articles, and posts about this orchestra.
          Format: { items: [{ title: string, description: string, url: string, source: string, thumbnail?: string, type: 'video' | 'article' }] }`
        },
        {
          role: 'user',
          content: `Find recent videos, articles, and news about the Black Diaspora Symphony Orchestra and similar community orchestras in Milwaukee. Return structured JSON with title, description, url, source, and type.`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const responseContent = completion.choices[0].message.content || '{}'
    const data = JSON.parse(responseContent)

    // Ensure items is an array and transform to expected format
    const items = Array.isArray(data.items) ? data.items : []

    return NextResponse.json({
      success: true,
      items: items.map((item: any) => ({
        title: item.title || 'Untitled',
        description: item.description || '',
        url: item.url || '',
        source: item.source || 'Unknown',
        thumbnail: item.thumbnail || null,
        type: item.type || (item.url?.includes('youtube') || item.url?.includes('youtu.be') ? 'video' : 'article'),
        mediaType: item.type || (item.url?.includes('youtube') || item.url?.includes('youtu.be') ? 'video' : 'article'),
      }))
    })

  } catch (error) {
    console.error('Pulse media error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch media', 
        items: [] 
      },
      { status: 500 }
    )
  }
}

