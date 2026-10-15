import { revalidateTag } from 'next/cache';

export const HOME_SALON_CACHE_TAG = 'homepage-top-salons';

export function revalidateHomeSalons() {
  revalidateTag(HOME_SALON_CACHE_TAG, { expire: 0 });
}
