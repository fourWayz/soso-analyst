import { NextRequest, NextResponse } from 'next/server';
import { generateReport, ReportInput } from '@/lib/claude';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const input: ReportInput = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const report = await generateReport(input);
    return NextResponse.json(report);
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
