import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { Suspense } from 'react';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import RootInit from '@/components/RootInit';
import FlashScreen from '@/components/FlashScreen';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Miks & Chiks | Soft Premium Maternity & Kids Wear',
  description: 'Experience the finest maternity and kids wear at Miks & Chiks. Premium quality, ultimate comfort, and effortless style for mothers and little ones in Kochi.',
  keywords: ['maternity wear', 'kids wear', 'Kochi', 'children clothing', 'maternity fashion', 'baby clothes', 'premium maternity', 'soft baby wear'],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  metadataBase: new URL('https://miksandchiks.com'),
  openGraph: {
    title: 'Miks & Chiks | Soft Premium Maternity & Kids Wear',
    description: 'Experience the finest maternity and kids wear in Kochi. Crafted for precious moments.',
    url: 'https://miksandchiks.com',
    siteName: 'Miks & Chiks',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'Miks & Chiks Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miks & Chiks | Premium Maternity & Kids Wear',
    description: 'Experience the finest maternity and kids wear in Kochi.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans`} suppressHydrationWarning>
        <RootInit />
        <Suspense fallback={null}>
          <GoogleAnalytics />
          <WebVitalsReporter />
        </Suspense>
        <AuthProvider>
          <CartProvider>
            {children}
            <FlashScreen />
            <Toaster richColors closeButton position="top-center" />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
