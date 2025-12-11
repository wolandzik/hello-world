import type { AppProps } from 'next/app';

import { QueryProvider } from '../providers/query-client';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryProvider>
      <Component {...pageProps} />
    </QueryProvider>
  );
}
