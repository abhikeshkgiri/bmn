import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInventoryItem extends Document {
  _id: Types.ObjectId;
  salon: Types.ObjectId;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

InventoryItemSchema.index({ salon: 1, name: 1 }, { unique: true });
const InventoryItem = mongoose.models.InventoryItem || mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
export default InventoryItem;
