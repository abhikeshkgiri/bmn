import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import SupportTicket from '@/models/SupportTicket';
import { connectDB } from '@/lib/db';
import { z, ZodError } from 'zod';

const TicketSchema = z.object({ category: z.enum(['BOOKING', 'PAYMENT', 'ACCOUNT', 'SALON', 'OTHER']), subject: z.string().trim().min(3).max(160), message: z.string().trim().min(1).max(4000) });

export async function GET() {
  const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  await connectDB(); return NextResponse.json({ success: true, data: await SupportTicket.find({ customer: current._id }).sort({ updatedAt: -1 }) });
}

export async function POST(request: NextRequest) {
  try {
    const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = TicketSchema.parse(await request.json()); await connectDB();
    const ticket = await SupportTicket.create({ customer: current._id, category: input.category, subject: input.subject, messages: [{ author: current._id, message: input.message }] });
    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) { if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 }); return NextResponse.json({ success: false, error: 'Unable to create support ticket' }, { status: 500 }); }
}
