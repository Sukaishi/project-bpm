import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { Chart, LineController, LineElement, CategoryScale } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from "framer-motion"
import Cookies from 'js-cookie';
import Link from 'next/link';
import Head from 'next/head';
import styles from '../styles/patientDashboard.module.scss';
import Image from 'next/image';
import heartLogo from '../public/bpm-card-image.png';
import tempImage from '../public/tempImage.jpg';
import moment from 'moment';
import 'chartjs-adapter-moment';

Chart.register(LineController, LineElement, CategoryScale);

const PatientDashboard = () => {
  const [fullName, setFullName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [bpmData, setBpmData] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [userBpm, setUserBpm] = useState(null);
  const [userBpmTime, setUserBpmTime] = useState('');
  const [averageBpm, setAverageBpm] = useState(null);
  const userEmail = Cookies.get('userEmail');
  const cardTitle = ['X-Ray Camera', 'Tumor Detection', 'Cancer Detection'];

  const sendAverageBpmToFirestore = useCallback(async (date, averageBpm) => {
    try {
      const patientCollectionRef = collection(db, 'patients');
      const q = query(patientCollectionRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const patientDoc = querySnapshot.docs[0];
        const patientId = patientDoc.id;
        const patientRef = doc(db, 'patients', patientId);
        const patientData = (await getDoc(patientRef)).data();
        await setDoc(patientRef, { ...patientData, bpmAverages: { ...patientData.bpmAverages, [date]: averageBpm } }, { merge: true });
      }

    } catch (error) {
      console.error('Error adding average BPM to Firestore:', error);
    }
  }, [userEmail]);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const patientCollectionRef = collection(db, 'patients');
        const q = query(patientCollectionRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const patientDoc = querySnapshot.docs[0];
          const data = patientDoc.data();
          setFullName(`${data.firstName} ${data.lastName}`)
          setBpmData(data.bpm);
          const dates = Object.keys(data.bpm || {}).filter(date =>
            Object.keys(data.bpm[date]).length > 0
          );
          setAvailableDates(dates);

          if (dates.length > 0) {
            const sortedDates = dates.sort((a, b) => moment(b, 'MM/DD/YYYY').diff(moment(a, 'MM/DD/YYYY')));
            setSelectedDate(sortedDates[0]);
          }

        }

      } catch (error) {
        console.error('Error fetching patient data:', error);
      }
    };
  
    if (userEmail) {
      fetchPatientData();
    }
  }, [userEmail]);

  useEffect(() => {
    if (selectedDate && bpmData[selectedDate]) {
      const latestEntry = Object.entries(bpmData[selectedDate])
        .sort(([timeA], [timeB]) => moment(timeA, 'HH:mm:ss').diff(moment(timeB, 'HH:mm:ss')));
  
      if (latestEntry.length > 0) {
        setUserBpm(latestEntry[0][1].bpmValue);
        setUserBpmTime(moment(latestEntry[0][0], 'HH:mm:ss').format('h:mm A'));
      } else {
        setUserBpm(null);
        setUserBpmTime('');
      }
    } else {
      setUserBpm(null);
      setUserBpmTime('');
    }
  }, [bpmData, selectedDate]);
  
  useEffect(() => {
    if (selectedDate && bpmData[selectedDate]) {
        const entries = Object.entries(bpmData[selectedDate]);
        if (entries.length > 0) {
          const totalBpm = entries.reduce((acc, entry) => acc + entry[1].bpmValue, 0);
          const avgBpm = totalBpm / entries.length;
          const roundedAvgBpm = parseFloat(avgBpm.toFixed(1)); // Convert to number with one decimal place
          setAverageBpm(roundedAvgBpm);
          sendAverageBpmToFirestore(selectedDate, roundedAvgBpm); // Pass the roundedAvgBpm to the function
        } else {
          setAverageBpm(null);
        }
    } else {
        setAverageBpm(null);
    }
  }, [selectedDate, bpmData, sendAverageBpmToFirestore]);
  

  const handleDateChange = event => {
    setSelectedDate(event.target.value);
  };

  return (
    <motion.div
      initial={{ opacity: 0}}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}>

      <Head>
        <title>Patient Dashboard</title>
        <meta name="description" content="A Computer Vision project that detects a person's Heart Rate Per Minute (BPM) for medical consultation data gathering" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <div className={styles.mainContainer}>
        <div className={styles.subContainer}>
          <h1>Welcome, {fullName}!</h1>
          <div className={styles.cards}>
            <div className={styles.topCard}>
              <div className={styles.mainCardContainer}>
                <motion.div className={styles.mainCard}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.9 }}>
                  <Link href={'/heart-rate'}>
                    <Image src={heartLogo} alt="Card Image" />
                    <div className={styles.content}>
                      <h2>Heart Rate Detection</h2>
                      <p>Using Computer Vision, Patient Heart Rate will be determined using only a Camera.</p>
                    </div>
                  </Link>
                </motion.div>
                <div className={styles.displayBpm}>
                  <div className={styles.currentBpmCard}>
                    <h1>Current BPM</h1>
                      {userBpm !== null ? 
                        <div>
                          <p>{userBpm}</p>
                          <p>{userBpmTime}</p>
                        </div>
                      : <p className={styles.noDataBpm}>N/A</p>}
                  </div>
                  <div className={styles.currentBpmCard}>
                    <h1>Average BPM</h1>
                      {averageBpm !== null ? 
                        <div>
                          <p style={{color : '#0452ce'}}>{averageBpm}</p>
                          <p>{selectedDate}</p>
                        </div>
                      : <p className={styles.noDataBpm}>N/A</p>}
                  </div>
                </div>
              </div>
              <div className={styles.bpmData}>
                <select onChange={handleDateChange} className={styles.selectDate}>
                  <option>Select Date</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
                {selectedDate && bpmData[selectedDate] !== undefined ? (
                  <Line
                    data={{
                      datasets: [
                        {
                          label: 'Daily BPM Data',
                          data: Object.entries(bpmData[selectedDate]).sort(([timeA], [timeB]) => moment(timeA, 'HH:mm:ss').diff(moment(timeB, 'HH:mm:ss'))).map(([time, { bpmValue }]) => ({
                            x: moment(time, 'HH:mm:ss').toDate(),
                            y: bpmValue || 0,
                          })),
                          pointRadius: 6,
                          borderColor: '#bfbfbf', // Line color
                          borderWidth: 1, // Line width
                          pointBackgroundColor: ctx => {
                            const value = ctx.dataset.data[ctx.dataIndex].y;
                            if (value >= 0 && value <= 40) {
                              return '#eefa05';
                            } else if (value >= 41 && value <= 70) {
                                return '#2afa05';
                            } else if (value >= 71 && value <= 90) {
                                return '#fc0303';
                            } else {
                                return '#0452ce';
                            }
                          },
                        },
                      ],
                    }}
                    options={{
                      scales: {
                        x: {
                          type: 'time',
                          time: {
                            unit: 'minute',
                          },
                          title: {
                            display: true,
                            text: 'Time',
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'BPM Value',
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <p className={styles.noData}>No available data for this date.</p>
                )}

              </div>
            </div>
            <hr />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PatientDashboard;
