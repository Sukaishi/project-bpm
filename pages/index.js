import { useEffect, useState } from 'react';
import Head from 'next/head';
import io from 'socket.io-client';
import styles from '../styles/Home.module.css'

export default function Home() {
  const [bpm, setBpm] = useState(0);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    // Listen for BPM updates from the WebSocket server
    socket.on('bpm_update', ({ bpm }) => {
      setBpm(bpm);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Medical Consultation</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <p>BPM: {bpm}</p>
        <div>
        <iframe src="http://127.0.0.1:5000/face_detection" width="650" height="550" frameBorder="0"></iframe>
        <iframe src="http://127.0.0.1:5000/bpm_detection" width="320" height="240" frameBorder="0"></iframe>
        </div>
      </div>
    </>
  );
}
