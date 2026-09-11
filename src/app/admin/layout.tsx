import Link from 'next/link';

const navItems = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/salons', label: 'Salons' },
  { href: '/admin/barbers', label: 'Barbers' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/memberships', label: 'Memberships' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/leaves', label: 'Leaves' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:block">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-pink">BookMyNai</p>
            <h1 className="mt-2 text-2xl font-bold">Admin</h1>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-brand-pink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
