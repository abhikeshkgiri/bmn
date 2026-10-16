import Link from 'next/link';
import { Footer, FooterBottom, FooterDivider, FooterLink, FooterSection } from '@/components/footer/Footer';
import Logo from '@/components/navbar/Logo';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { href: '/salons', label: 'Browse salons' },
      { href: '/barbers', label: 'Find barbers' },
      { href: '/services', label: 'Services' },
      { href: '/offers', label: 'Offers' },
    ],
  },
  {
    title: 'For businesses',
    links: [
      { href: '/salon', label: 'Salon portal' },
      { href: '/salon/signup', label: 'Register your salon' },
      { href: '/barber/signup', label: 'Join as a barber' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/blog', label: 'Blog' },
      { href: '/careers', label: 'Careers' },
      { href: '/press', label: 'Press' },
    ],
  },
  {
    title: 'Help & legal',
    links: [
      { href: '/support', label: 'Help center' },
      { href: '/contact', label: 'Contact us' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
      { href: '/refund-policy', label: 'Refund policy' },
      { href: '/cookie-policy', label: 'Cookie policy' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <Footer className="mt-auto bg-neutral-50">
      <div className="mb-10 max-w-sm">
        <Logo size="md" />
        <p className="mt-3 text-sm text-foreground-secondary">
          Find local salons, compare their services and book an appointment that fits your day.
        </p>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {footerGroups.map((group) => (
          <FooterSection key={group.title} title={group.title}>
            {group.links.map((link) => (
              <FooterLink key={link.href} href={link.href}>{link.label}</FooterLink>
            ))}
          </FooterSection>
        ))}
      </div>
      <FooterDivider />
      <FooterBottom>
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <span>© {new Date().getFullYear()} BookMyNai. All rights reserved.</span>
          </div>
          <Link href="/status" className="hover:text-brand-pink">Service status</Link>
        </div>
      </FooterBottom>
    </Footer>
  );
}
