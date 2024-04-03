import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Link from 'next/link';
import Head from 'next/head';
import Cookies from 'js-cookie';
import styles from './login.module.scss'

const PatientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Enter Email or Password');
      return;
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      let validUser = false;
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email === email && userData.password === password && userData.role === 'Patient') {
          validUser = true;
          Cookies.set('patientEmail', email);
          Cookies.set('showModal', false);
        }
      });

      if (validUser) {
        window.location.href = '/patient-dashboard';
      } else {
        setError('Invalid Credentials for Patient.');
      }
    } catch (error) {
      setError('Error logging in. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Patient Login</title>
      </Head>
      <div className={styles.mainContainer}>
          <div className={styles.loginForm}>
            <h2>Patient Login</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleLogin}>Login</button>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <p className={styles.signup}>No Patient account? <Link href="/signup/patient">Sign Up as a Patient</Link></p>
          </div>
      </div>
    </>
  );
};

export default PatientLogin;