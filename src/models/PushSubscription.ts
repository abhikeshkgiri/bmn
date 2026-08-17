import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPushSubscription extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // Reference to User
  endpoint: string; // Push service endpoint
  auth: string; // VAPID auth token
  p256dh: string; // VAPID public key
  userAgent?: string; // Browser/device info
  isActive: boolean;
  lastNotificationSent?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    auth: {
      type: String,
      required: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastNotificationSent: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
PushSubscriptionSchema.index({ user: 1, isActive: 1 });
PushSubscriptionSchema.index({ createdAt: -1 });

const PushSubscription =
  mongoose.models.PushSubscription || mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
