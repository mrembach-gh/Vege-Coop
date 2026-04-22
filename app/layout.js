import './globals.css';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata = {
  title: 'Vege Coop',
  description: 'Vegetable co-op shopping assistant',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vege Coop',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={outfit.className} suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
