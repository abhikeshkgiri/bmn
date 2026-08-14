'use client';

import React, { useState } from 'react';
import Logo from '@/components/navbar/Logo';
import Button from '@/components/ui/Button';
import { Input, Textarea, Select, Checkbox, Radio } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import Separator from '@/components/ui/Separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import Tooltip from '@/components/ui/Tooltip';
import { Spinner, Skeleton, LoadingButton } from '@/components/ui/Loading';
import { Navbar, NavbarBrand, NavbarMenu, NavbarMenuItem, NavbarActions } from '@/components/navbar/Navbar';
import { Footer, FooterSection, FooterLink, FooterDivider, FooterBottom } from '@/components/footer/Footer';

export default function UIShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingState, setLoadingState] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar>
        <NavbarBrand>
          <Logo size="md" />
        </NavbarBrand>
        <NavbarMenu>
          <NavbarMenuItem href="#" active>Home</NavbarMenuItem>
          <NavbarMenuItem href="#">About</NavbarMenuItem>
          <NavbarMenuItem href="#">Services</NavbarMenuItem>
        </NavbarMenu>
        <NavbarActions>
          <Button variant="primary" size="sm">Sign In</Button>
        </NavbarActions>
      </Navbar>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            <span style={{ color: '#111111' }}>Book</span>
            <span style={{ color: '#FF2D7A' }}>My</span>
            <span style={{ color: '#111111' }}>Nai</span>
          </h1>
          <p className="text-xl text-foreground-secondary">UI Design System Showcase</p>
          <p className="text-sm text-foreground-muted max-w-2xl mx-auto">
            A comprehensive showcase of the BookMyNai global theme, color system, and reusable UI components built with TypeScript and Tailwind CSS.
          </p>
        </section>

        {/* Brand Colors */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Brand Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="w-full h-24 bg-brand-black rounded-lg" />
              <p className="text-sm font-medium text-foreground">Brand Black</p>
              <p className="text-xs text-foreground-muted">#111111</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-24 bg-brand-pink rounded-lg" />
              <p className="text-sm font-medium text-foreground">Brand Pink</p>
              <p className="text-xs text-foreground-muted">#FF2D7A</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-24 bg-brand-pink-hover rounded-lg" />
              <p className="text-sm font-medium text-foreground">Pink Hover</p>
              <p className="text-xs text-foreground-muted">#E91E63</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-24 bg-white border-2 border-border rounded-lg" />
              <p className="text-sm font-medium text-foreground">Brand White</p>
              <p className="text-xs text-foreground-muted">#FFFFFF</p>
            </div>
          </div>
        </section>

        {/* Pink Scale */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Pink Color Scale</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {[
              { name: '50', value: '#FFF1F6' },
              { name: '100', value: '#FFE4EE' },
              { name: '200', value: '#FFC9DC' },
              { name: '300', value: '#FFA3C2' },
              { name: '400', value: '#FF6F9F' },
              { name: '500', value: '#FF2D7A' },
              { name: '600', value: '#E91E63' },
              { name: '700', value: '#C2185B' },
              { name: '800', value: '#AD1457' },
              { name: '900', value: '#880E4F' },
              { name: '950', value: '#56002F' },
            ].map((color) => (
              <div key={color.name} className="space-y-2">
                <div
                  className="w-full h-16 rounded-lg"
                  style={{ backgroundColor: color.value }}
                />
                <p className="text-xs font-medium text-foreground">Pink {color.name}</p>
                <p className="text-xs text-foreground-muted">{color.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Neutral Scale */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Neutral Color Scale</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {[
              { name: '50', value: '#FAFAFA' },
              { name: '100', value: '#F5F5F5' },
              { name: '200', value: '#E5E5E5' },
              { name: '300', value: '#D4D4D4' },
              { name: '400', value: '#A3A3A3' },
              { name: '500', value: '#737373' },
              { name: '600', value: '#525252' },
              { name: '700', value: '#404040' },
              { name: '800', value: '#262626' },
              { name: '900', value: '#171717' },
              { name: '950', value: '#0A0A0A' },
            ].map((color) => (
              <div key={color.name} className="space-y-2">
                <div
                  className="w-full h-16 rounded-lg border border-border"
                  style={{ backgroundColor: color.value }}
                />
                <p className="text-xs font-medium text-foreground">Neutral {color.name}</p>
                <p className="text-xs text-foreground-muted">{color.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Typography</h2>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Display</p>
                <h1 className="text-5xl font-bold text-foreground">Display Text</h1>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Heading 1</p>
                <h1 className="text-4xl font-bold text-foreground">Heading 1 Text</h1>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Heading 2</p>
                <h2 className="text-3xl font-bold text-foreground">Heading 2 Text</h2>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Heading 3</p>
                <h3 className="text-2xl font-semibold text-foreground">Heading 3 Text</h3>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Body</p>
                <p className="text-base text-foreground">This is body text. It should be readable and comfortable to read for longer passages of text on the website.</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Small</p>
                <p className="text-sm text-foreground">Small text for descriptions and secondary information.</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wide mb-2">Caption</p>
                <p className="text-xs text-foreground-muted">Caption text for metadata and additional context.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Buttons</h2>
          <Card>
            <CardContent className="space-y-8 pt-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Primary</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" isLoading>Loading</Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Secondary</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="secondary" size="sm">Small</Button>
                  <Button variant="secondary" size="md">Medium</Button>
                  <Button variant="secondary" size="lg">Large</Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Outline</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm">Small</Button>
                  <Button variant="outline" size="md">Medium</Button>
                  <Button variant="outline" size="lg">Large</Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Ghost</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="ghost" size="sm">Small</Button>
                  <Button variant="ghost" size="md">Medium</Button>
                  <Button variant="ghost" size="lg">Large</Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Link</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="link" size="sm">Small Link</Button>
                  <Button variant="link" size="md">Medium Link</Button>
                  <Button variant="link" size="lg">Large Link</Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Destructive</p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="destructive" size="sm">Delete</Button>
                  <Button variant="destructive" size="md">Cancel Booking</Button>
                  <Button variant="destructive" size="lg">Remove</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Inputs */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Form Inputs</h2>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <Input
                label="Text Input"
                placeholder="Enter your name"
                description="This is a text input field"
              />
              <Input
                label="Input with Error"
                placeholder="Something went wrong"
                error="This field is required"
                defaultValue="Invalid value"
              />
              <Input
                label="Disabled Input"
                placeholder="Disabled"
                disabled
                defaultValue="Cannot edit this"
              />
              <Textarea
                label="Textarea"
                placeholder="Enter your message"
                description="This is a textarea field"
                rows={4}
              />
              <Select
                label="Select Option"
                options={[
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' },
                ]}
              />
              <div className="space-y-3">
                <Checkbox label="Agree to terms" />
                <Checkbox label="Subscribe to newsletter" />
                <Checkbox label="Disabled checkbox" disabled />
              </div>
              <div className="space-y-3">
                <Radio label="Option 1" name="radio-group" />
                <Radio label="Option 2" name="radio-group" />
                <Radio label="Option 3" name="radio-group" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Cards</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>This is a card description</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">Card content goes here. Cards are used to organize and display related information in a contained format.</p>
              </CardContent>
              <CardFooter>
                <Button variant="primary" size="sm">Action</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Another Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">This card demonstrates the flexible card structure with header, content, and footer sections.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Badges</h2>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="pink">Pink</Badge>
                <Badge variant="success">Available</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="error">Cancelled</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Avatar */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Avatar</h2>
          <Card>
            <CardContent className="flex items-center gap-8 pt-6">
              <div className="space-y-2 text-center">
                <Avatar initials="AB" size="sm" />
                <p className="text-xs text-foreground-muted">Small</p>
              </div>
              <div className="space-y-2 text-center">
                <Avatar initials="CD" size="md" />
                <p className="text-xs text-foreground-muted">Medium</p>
              </div>
              <div className="space-y-2 text-center">
                <Avatar initials="EF" size="lg" />
                <p className="text-xs text-foreground-muted">Large</p>
              </div>
              <div className="space-y-2 text-center">
                <Avatar initials="GH" size="md" status="online" />
                <p className="text-xs text-foreground-muted">Online Status</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tabs */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Tabs</h2>
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="tab1">
                <TabsList>
                  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">
                  <p className="text-sm text-foreground">Content for Tab 1</p>
                </TabsContent>
                <TabsContent value="tab2">
                  <p className="text-sm text-foreground">Content for Tab 2</p>
                </TabsContent>
                <TabsContent value="tab3">
                  <p className="text-sm text-foreground">Content for Tab 3</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Loading States */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Loading States</h2>
          <Card>
            <CardContent className="space-y-8 pt-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Spinner</p>
                <div className="flex gap-4">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Skeleton</p>
                <div className="space-y-2 w-full">
                  <Skeleton height="1rem" />
                  <Skeleton height="1rem" width="80%" />
                  <Skeleton height="4rem" />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold text-foreground mb-4">Loading Button</p>
                <LoadingButton isLoading={loadingState} onClick={() => setLoadingState(!loadingState)}>
                  {loadingState ? 'Loading...' : 'Click to Load'}
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Dialog */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Dialog / Modal</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <div className="flex gap-2">
              <DialogTrigger>
                <Button variant="primary">Open Dialog</Button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>This is a modal dialog for important interactions and information.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Dialog Input" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        {/* Dropdown */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Dropdown</h2>
          <Dropdown
            trigger={<Button variant="outline">Open Menu</Button>}
          >
            <DropdownItem onClick={() => {}}>Profile</DropdownItem>
            <DropdownItem onClick={() => {}}>Settings</DropdownItem>
            <DropdownItem onClick={() => {}}>Bookings</DropdownItem>
            <DropdownItem onClick={() => {}}>Sign Out</DropdownItem>
          </Dropdown>
        </section>

        {/* Tooltip */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Tooltip</h2>
          <Card>
            <CardContent className="flex gap-4 pt-6">
              <Tooltip content="This is a helpful tooltip">
                <Button variant="outline">Hover me</Button>
              </Tooltip>
              <Tooltip content="Important information" side="right">
                <Button variant="outline">Hover me</Button>
              </Tooltip>
            </CardContent>
          </Card>
        </section>

        {/* Semantic Colors */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Semantic Colors</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-success-600">Success</CardTitle>
              </CardHeader>
              <CardContent className="bg-success-50 rounded">
                <p className="text-sm text-success-600">This indicates a successful action or positive state.</p>
                <Badge variant="success" className="mt-4">Booking Confirmed</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-warning-600">Warning</CardTitle>
              </CardHeader>
              <CardContent className="bg-warning-50 rounded">
                <p className="text-sm text-warning-600">This indicates a warning or attention-required state.</p>
                <Badge variant="warning" className="mt-4">Slot Limited</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-error-600">Error</CardTitle>
              </CardHeader>
              <CardContent className="bg-error-50 rounded">
                <p className="text-sm text-error-600">This indicates an error or failed action.</p>
                <Badge variant="error" className="mt-4">Booking Failed</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-info-600">Info</CardTitle>
              </CardHeader>
              <CardContent className="bg-info-50 rounded">
                <p className="text-sm text-info-600">This indicates informational content.</p>
                <Badge variant="info" className="mt-4">New Feature</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer className="mt-16">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <FooterSection title="Company">
            <FooterLink href="#">About</FooterLink>
            <FooterLink href="#">Blog</FooterLink>
            <FooterLink href="#">Careers</FooterLink>
          </FooterSection>
          <FooterSection title="Support">
            <FooterLink href="#">Help Center</FooterLink>
            <FooterLink href="#">Contact</FooterLink>
            <FooterLink href="#">FAQs</FooterLink>
          </FooterSection>
          <FooterSection title="Legal">
            <FooterLink href="#">Privacy</FooterLink>
            <FooterLink href="#">Terms</FooterLink>
            <FooterLink href="#">Cookies</FooterLink>
          </FooterSection>
          <FooterSection title="Social">
            <FooterLink href="#">Twitter</FooterLink>
            <FooterLink href="#">Instagram</FooterLink>
            <FooterLink href="#">Facebook</FooterLink>
          </FooterSection>
        </div>
        <FooterDivider />
        <FooterBottom>
          <p>&copy; 2026 BookMyNai. All rights reserved. | UI Design System v1.0</p>
        </FooterBottom>
      </Footer>
    </div>
  );
}
