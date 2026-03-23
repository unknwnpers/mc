import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Miks & Chiks - Maternity & Kids Wear in Kochi',
  description: 'Shop comfortable and stylish maternity wear and kids wear at Miks & Chiks, Kochi. Quality clothing for mothers and children at affordable prices.',
  keywords: ['maternity wear', 'kids wear', 'Kochi', 'children clothing', 'maternity fashion', 'baby clothes'],
  metadataBase: new URL('https://miksandchiks.com'),
  openGraph: {
    title: 'Miks & Chiks - Maternity & Kids Wear',
    description: 'Shop comfortable and stylish maternity wear and kids wear in Kochi',
    url: 'https://miksandchiks.com',
    siteName: 'Miks & Chiks',
    images: [
      {
        url: '/mother-baby.jpg',
        width: 1200,
        height: 630,
        alt: 'Miks & Chiks Maternity & Kids Wear',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miks & Chiks - Maternity & Kids Wear',
    description: 'Shop comfortable and stylish maternity wear and kids wear in Kochi',
    images: ['/pregnant-lady.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            {children}
            <Toaster richColors closeButton position="top-center" />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
