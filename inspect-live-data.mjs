import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./scripts/test-db-bootstrap.cjs');

const [{ connectDB }, { default: Salon }, { default: Barber }, { default: Service }] = await Promise.all([
  import('./src/lib/db.ts'),
  import('./src/models/Salon.ts'),
  import('./src/models/Barber.ts'),
  import('./src/models/Service.ts'),
]);

const main = async () => {
  await connectDB();
  const salons = await Salon.find({}, { name: 1, slug: 1, 'address.city': 1, isActive: 1 }).limit(10).lean();
  console.log('SALONS', JSON.stringify(salons, null, 2));
  console.log('COUNT', await Salon.countDocuments());
  console.log('BARBERS', await Barber.countDocuments());
  console.log('SERVICES', await Service.countDocuments());
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
