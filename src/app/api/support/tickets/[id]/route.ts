import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import SupportTicket from '@/models/SupportTicket';
import { connectDB } from '@/lib/db';
import { z, ZodError } from 'zod';

const MessageSchema = z.object({ message: z.string().trim().min(1).max(4000) });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id } = await params; await connectDB(); const ticket = await SupportTicket.findOne({ _id: id, customer: current._id });
  if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: ticket });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentUser(); if (!current || current.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const input = MessageSchema.parse(await request.json()); const { id } = await params; await connectDB();
    const ticket = await SupportTicket.findOneAndUpdate({ _id: id, customer: current._id, status: { $in: ['OPEN', 'IN_PROGRESS'] } }, { $push: { messages: { author: current._id, message: input.message } } }, { new: true });
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found or closed' }, { status: 404 });
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) { if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 }); return NextResponse.json({ success: false, error: 'Unable to reply to ticket' }, { status: 500 }); }
}
