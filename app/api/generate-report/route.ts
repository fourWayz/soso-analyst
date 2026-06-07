import { NextRequest, NextResponse } from 'next/server';
import { generateReport, ReportInput } from '@/lib/claude';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    let input: ReportInput;
    try {
      input = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured — add it to .env.local' },
        { status: 500 }
      );
    }

    if (!input.type || !input.news) {
      return NextResponse.json({ error: 'Missing required fields: type, news' }, { status: 400 });
    }

    const report = await generateReport(input);
    return NextResponse.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-report]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
