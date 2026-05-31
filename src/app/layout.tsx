import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TradeOS | Trading Journal & Analytics',
  description:
    'Premium trading journal and prop firm analytics platform. Track your trades, analyze performance, and maximize your edge.',
  keywords: ['trading journal', 'prop firm', 'analytics', 'trading platform'],
  icons: {
    icon: '/logo.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.className}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
