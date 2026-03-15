import { db } from '@/lib/db';
import { generateOpportunityRationale } from '@/lib/ai/rationale';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/[id]/rationale
 * Generate AI rationale for the opportunity and save to manualNotes.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const opp = await db.opportunity.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!opp) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const rationale = await generateOpportunityRationale({
      eventName: opp.event.name,
      eventStartTime: opp.event.startTime.toISOString(),
      estimatedBuyPrice: opp.estimatedBuyPrice?.toString(),
      estimatedSellPrice: opp.estimatedSellPrice?.toString(),
      projectedProfit: opp.projectedProfit?.toString(),
      opportunityScore: opp.opportunityScore,
      confidenceScore: opp.confidenceScore,
    });

    if (rationale) {
      await db.opportunity.update({
        where: { id },
        data: { manualNotes: rationale },
      });
    }

    return NextResponse.json({ success: true, rationale });
  } catch (error) {
    console.error('POST /api/opportunities/[id]/rationale error:', error);
    return NextResponse.json(
      { error: 'Failed to generate rationale' },
      { status: 500 }
    );
  }
}
