import mongoose, { Schema, Document, Types } from 'mongoose';

export type FavoriteTargetType = 'SALON' | 'BARBER';

export interface IFavorite extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  targetType: FavoriteTargetType;
  target: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['SALON', 'BARBER'], required: true, index: true },
    target: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FavoriteSchema.index({ customer: 1, targetType: 1, target: 1 }, { unique: true });
const Favorite = mongoose.models.Favorite || mongoose.model<IFavorite>('Favorite', FavoriteSchema);
export default Favorite;
