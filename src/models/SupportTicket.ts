import mongoose, { Schema, Document, Types } from 'mongoose';

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type SupportTicketCategory = 'BOOKING' | 'PAYMENT' | 'ACCOUNT' | 'SALON' | 'OTHER';

export interface ISupportMessage {
  _id?: Types.ObjectId;
  author: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<ISupportMessage>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  createdAt: { type: Date, default: Date.now },
});

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: ['BOOKING', 'PAYMENT', 'ACCOUNT', 'SALON', 'OTHER'], required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN', index: true },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

SupportTicketSchema.index({ customer: 1, updatedAt: -1 });
const SupportTicket = mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
export default SupportTicket;
