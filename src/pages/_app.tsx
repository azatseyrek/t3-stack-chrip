import { type AppType } from 'next/app';
import { Inter } from 'next/font/google';
import Head from 'next/head';

import { ClerkProvider } from '@clerk/nextjs';
import '~/styles/globals.css';
import { api } from '~/utils/api';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});
const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <main className={`font-sans ${inter.variable} `}>
      <Head>
        <title>Chirp</title>
        <meta name="description" content="💭" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ClerkProvider>
        <Component {...pageProps} />
      </ClerkProvider>
    </main>
  );
};

export default api.withTRPC(MyApp);
