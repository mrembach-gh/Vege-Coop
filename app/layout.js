import './globals.css';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata = {
  title: 'Vege Coop',
  description: 'Smart Shopping Assistant',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vege Coop',
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
    <html lang="en">
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
