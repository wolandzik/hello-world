import Head from 'next/head';
import styles from './index.module.css';
import { greet } from '../lib/greet';

export default function Home() {
  return (
    <>
      <Head>
        <title>Hello World Monorepo</title>
        <meta name="description" content="Starter monorepo app" />
      </Head>
      <main className={styles.main}>
        <h1>Hello from the frontend</h1>
        <p>{greet('Developer')}</p>
      </main>
    </>
  );
}
