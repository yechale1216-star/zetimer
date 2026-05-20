import { NextRequest, NextResponse } from 'next/server'

// Mock billing history data
const mockBillingHistory: Record<string, any[]> = {
  '1': [
    {
      id: 'bill-1',
      subscriptionId: '1',
      date: new Date('2024-04-01'),
      amount: 405,
      description: 'Semester charge for 150 users',
      status: 'completed',
      invoiceUrl: '/invoices/bill-1.pdf',
    },
    {
      id: 'bill-2',
      subscriptionId: '1',
      date: new Date('2024-01-01'),
      amount: 405,
      description: 'Initial semester charge for 150 users',
      status: 'completed',
      invoiceUrl: '/invoices/bill-2.pdf',
    },
    {
      id: 'bill-3',
      subscriptionId: '1',
      date: new Date('2023-10-01'),
      amount: 540,
      description: 'Previous yearly plan charge',
      status: 'completed',
      invoiceUrl: '/invoices/bill-3.pdf',
    },
  ],
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const history = mockBillingHistory[id] || []
    const startIdx = (page - 1) * limit
    const endIdx = startIdx + limit

    const paginatedHistory = history.slice(startIdx, endIdx)
    const total = history.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      billing_history: paginatedHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
