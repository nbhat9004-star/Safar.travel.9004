import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-poppins', display: 'swap' });

export const metadata = {
  title: 'Safar — Experience Kashmir Like a Local',
  description: 'Book authentic Kashmir stays, houseboats, cabins, transport and AI-planned itineraries. Premium tourism marketplace for Kashmir, India.',
  keywords: ['Kashmir tourism','Srinagar houseboats','Gulmarg cabins','Pahalgam cottages','AI trip planner','Safar'],
  openGraph: {
    title: 'Safar — Experience Kashmir Like a Local',
    description: 'Authentic Kashmir stays, experiences and AI-powered travel planning.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
