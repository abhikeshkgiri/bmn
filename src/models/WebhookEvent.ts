import mongoose, { Schema, Document, Types } from 'mongoose';

export type WebhookEventStatus = 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface IWebhookEvent extends Document {
  _id: Types.ObjectId;
  eventId: string;
  event: string;
  status: WebhookEventStatus;
  attempts: number;
  lastError?: string;
  processedAt?: Date;
  claimToken?: string;
  leaseExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    event: { type: String, required: true, index: true },
    status: { type: String, enum: ['PROCESSING', 'PROCESSED', 'FAILED'], required: true, index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    processedAt: { type: Date, default: null },
    claimToken: { type: String, default: null },
    leaseExpiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

export default WebhookEvent;
