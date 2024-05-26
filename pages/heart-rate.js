import { useEffect, useState, toggleButton } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import {motion} from'framer-motion'
import Head from 'next/head';
import styles from '../styles/heartRate.module.scss';
import 'react-circular-progressbar/dist/styles.css';
import Image from 'next/image';
import hearBeat from '../public/heartbeat.gif';
import Cookies from 'js-cookie';
import moment from 'moment';
import io from 'socket.io-client';
import LinearProgress from '@mui/joy/LinearProgress';
import Switch from 'react-switch';
import BrightnessIcon from '../public/brightness.svg';
import DistanceIcon from '../public/distance.svg';
import FaceIcon from '../public/face.svg';


export default function HeartRate() {
  const [bpm, setBpm] = useState(0);
  const [finalBpm, setFinalBpm] = useState(0);
  const [bufferIndex, setBufferIndex] = useState(0);
  const [showFinalBpm, setShowFinalBpm] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [conditionState, setConditionState] = useState('');
  const [timer, setTimer] = useState(0);
  const [isButtonClickable, setIsButtonClickable] = useState(false);
  const [brightnessStatus, setBrightnessStatus] = useState('');
  const [distanceStatus, setDistanceStatus] = useState('');
  const [isBpmVideo, setIsBpmVideo] = useState(false);
  const [faceStatus, setFaceStatus] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('bpm_update', ({ bpm, bufferIndex }) => {
      setBpm(bpm);
      setBufferIndex(bufferIndex);

      if (bufferIndex === 149 && !(bpm < 40)) {
        setShowFinalBpm(true);
        setFinalBpm(bpm);
      }

      if (bpm === 0 && bufferIndex === 0) {
        setTimer(0);
        setIsButtonClickable(false);
      }
    });

    socket.on('brightness_status', ({ bstatus }) => {
      setBrightnessStatus(bstatus);
    });

    socket.on('distance_status', ({ dstatus }) => {
      setDistanceStatus(dstatus);
    });

    socket.on('face_status', ({ fstatus }) => {
      setFaceStatus(fstatus);
    });

    const fetchPatientData = async () => {
      try {
        const userEmail = Cookies.get('userEmail');

        if (userEmail) {
          const q = query(collection(db, 'patients'), where("email", "==", userEmail));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const patientDoc = querySnapshot.docs[0];
            const data = patientDoc.data();
            setPatientData({ ...data, id: patientDoc.id });
          }
        }
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
      }
    };
    
    fetchPatientData();

    return () => {
      socket.disconnect();
    };

  }, []);

  useEffect(() => {
    if (finalBpm > 0 && patientData) {
      const condition = calculateConditionState(finalBpm);
      setConditionState(condition);
    }
  }, [finalBpm, patientData]);

  const handleShowBpm = () => {
    setShowFinalBpm(true);
    setFinalBpm(bpm);
  };

  const resetTimer = () => {
    setTimer(0);
    setIsButtonClickable(false);
  };

  useEffect(() => {
    let intervalId;
    if (bpm !== 0 && !isButtonClickable) {
      intervalId = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer >= 10) {
            clearInterval(intervalId);
            setIsButtonClickable(true);
            return prevTimer;
          }
          return prevTimer + 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [bpm, isButtonClickable]);

  const calculateConditionState = (finalBpm) => {
  let conditionState = '';
      if (patientData && patientData.gender === 'male') {
        if (patientData.age >= 18 && patientData.age <= 25) {
            conditionState = finalBpm <= 55 ? 'Athlete' : finalBpm <= 61 ? 'Excellent' : finalBpm <= 65 ? 'Great' : finalBpm <= 69 ? 'Good' : finalBpm <= 73 ? 'Average' : finalBpm <= 81 ? 'Below Average' : 'Poor';
        } else if (patientData.age >= 26 && patientData.age <= 35) {
            conditionState = finalBpm <= 54 ? 'Athlete' : finalBpm <= 61 ? 'Excellent' : finalBpm <= 65 ? 'Great' : finalBpm <= 70 ? 'Good' : finalBpm <= 74 ? 'Average' : finalBpm <= 81 ? 'Below Average' : 'Poor';
        } else if (patientData.age >= 36 && patientData.age <= 45) {
            conditionState = finalBpm <= 56 ? 'Athlete' : finalBpm <= 62 ? 'Excellent' : finalBpm <= 66 ? 'Great' : finalBpm <= 70 ? 'Good' : finalBpm <= 75 ? 'Average' : finalBpm <= 82 ? 'Below Average' : 'Poor';
        } else if (patientData.age >= 46 && patientData.age <= 55) {
            conditionState = finalBpm <= 57 ? 'Athlete' : finalBpm <= 63 ? 'Excellent' : finalBpm <= 67 ? 'Great' : finalBpm <= 71 ? 'Good' : finalBpm <= 76 ? 'Average' : finalBpm <= 83 ? 'Below Average' : 'Poor';
        } else if (patientData.age >= 56 && patientData.age <= 65) {
            conditionState = finalBpm <= 56 ? 'Athlete' : finalBpm <= 61 ? 'Excellent' : finalBpm <= 67 ? 'Great' : finalBpm <= 71 ? 'Good' : finalBpm <= 75 ? 'Average' : finalBpm <= 81 ? 'Below Average' : 'Poor';
        } else if (patientData.age > 65) {
            conditionState = finalBpm <= 55 ? 'Athlete' : finalBpm <= 61 ? 'Excellent' : finalBpm <= 65 ? 'Great' : finalBpm <= 69 ? 'Good' : finalBpm <= 73 ? 'Average' : finalBpm <= 79 ? 'Below Average' : 'Poor';
        }
      } else if (patientData && patientData.gender === 'female') {
          if (patientData.age >= 18 && patientData.age <= 25) {
              conditionState = finalBpm <= 60 ? 'Athlete' : finalBpm <= 65 ? 'Excellent' : finalBpm <= 69 ? 'Great' : finalBpm <= 73 ? 'Good' : finalBpm <= 78 ? 'Average' : finalBpm <= 84 ? 'Below Average' : 'Poor';
          } else if (patientData.age >= 26 && patientData.age <= 35) {
              conditionState = finalBpm <= 59 ? 'Athlete' : finalBpm <= 64 ? 'Excellent' : finalBpm <= 68 ? 'Great' : finalBpm <= 72 ? 'Good' : finalBpm <= 76 ? 'Average' : finalBpm <= 82 ? 'Below Average' : 'Poor';
          } else if (patientData.age >= 36 && patientData.age <= 45) {
              conditionState = finalBpm <= 59 ? 'Athlete' : finalBpm <= 64 ? 'Excellent' : finalBpm <= 69 ? 'Great' : finalBpm <= 73 ? 'Good' : finalBpm <= 78 ? 'Average' : finalBpm <= 84 ? 'Below Average' : 'Poor';
          } else if (patientData.age >= 46 && patientData.age <= 55) {
              conditionState = finalBpm <= 60 ? 'Athlete' : finalBpm <= 65 ? 'Excellent' : finalBpm <= 69 ? 'Great' : finalBpm <= 73 ? 'Good' : finalBpm <= 77 ? 'Average' : finalBpm <= 83 ? 'Below Average' : 'Poor';
          } else if (patientData.age >= 56 && patientData.age <= 65) {
              conditionState = finalBpm <= 59 ? 'Athlete' : finalBpm <= 64 ? 'Excellent' : finalBpm <= 68 ? 'Great' : finalBpm <= 73 ? 'Good' : finalBpm <= 77 ? 'Average' : finalBpm <= 83 ? 'Below Average' : 'Poor';
          } else if (patientData.age > 65) {
              conditionState = finalBpm <= 59 ? 'Athlete' : finalBpm <= 64 ? 'Excellent' : finalBpm <= 68 ? 'Great' : finalBpm <= 72 ? 'Good' : finalBpm <= 76 ? 'Average' : finalBpm <= 84 ? 'Below Average' : 'Poor';
          }
      }
      
      setConditionState(conditionState);
      return conditionState;
  }
  
  const handleSubmit = async () => {
    try {
      const currentDate = new Date().toLocaleDateString();
      const currentTime = moment().format('HH:mm:ss');

      if (!patientData) {
        console.error('Patient data not available.');
        return;
      }
      
      let conditionState = calculateConditionState(finalBpm);

      const newBpmData = {
        bpmValue: finalBpm, //add calculatation based on age. 
        finalConditionState: conditionState
      };

      const existingBpm = patientData.bpm || {};
      const updatedBpm = {
        ...existingBpm,
        [currentDate]: {
          ...existingBpm[currentDate],
          [currentTime]: newBpmData
        }
      };

      await updateDoc(doc(db, 'patients', patientData.id), {
        ...patientData,
        bpm: updatedBpm
      });

      window.location.href = '/patient-dashboard';
    } catch (error) {
      console.error('Error submitting BPM:', error);
    }
  };

  const MAX_BUFFER_INDEX = 149;

  const toggleButton = () => {
    setIsBpmVideo(prevIsBpmVideo => !prevIsBpmVideo);
  };

  return (
    <>
      <Head>
        <title>Heart Rate Detection</title>
        <meta name="description" content="A Computer Vision project that detects a person's Heart Rate Per Minute (BPM) for medical consultation data gathering" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <div className={styles.mainContainer}>
        {showFinalBpm ? (
          <div className={styles.modalBPM}>
            <motion.div className={styles.displayBPM}
              animate={{ y: 20 }}
              transition={{ type: "spring", stiffness: 1000 }}>
              <p>BPM</p>
              <h5 className={conditionState === 'Athlete' ? styles.athleteText :
              conditionState === 'Excellent' ? styles.excellentText :
              conditionState === 'Great' ? styles.greatText :
              conditionState === 'Good' ? styles.goodText :
              conditionState === 'Average' ? styles.averageText :
              conditionState === 'Below Average' ? styles.belowAverageText :
              conditionState === 'Poor' ? styles.poorText : ''}>{finalBpm}</h5>
              <p className={styles.statusText}>Status:</p>
              <p className={`${styles.commonStyleCondition} ${
              conditionState === 'Athlete' ? styles.athlete :
              conditionState === 'Excellent' ? styles.excellent :
              conditionState === 'Great' ? styles.great :
              conditionState === 'Good' ? styles.good :
              conditionState === 'Average' ? styles.average :
              conditionState === 'Below Average' ? styles.belowAverage :
              conditionState === 'Poor' ? styles.poor : ''}`}>
              {conditionState}
              </p>
              <div className={styles.buttons}>
                <button onClick={handleSubmit}> Submit</button>
                <button onClick={() => { 
                  // window.location.href = '/heart-rate';
                  setShowFinalBpm(false)
                  setBpm(0)
                  setBufferIndex(0)
                  setFinalBpm(0)
                  setConditionState('')
                  resetTimer()
                  }}> Retry</button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className={styles.showCard}>

            <div className={styles.videoContainer}>
              <iframe
              className={styles.faceVideo}
              src="http://127.0.0.1:5000/face_detection"
              scrolling="no"
              width="600"
              height="500"
              frameBorder="0"
              ></iframe>
              <iframe
              className={`${styles.video} ${isBpmVideo ? styles.visible : styles.hidden}`}
              src="http://127.0.0.1:5000/bpm_detection"
              scrolling="no"
              width="600"
              height="500"
              frameBorder="0"
              ></iframe>
            </div>
            <div>
              <div className={styles.statusContainer}>
                <div className={styles.brightnessStatus}>
                  <span><Image src={BrightnessIcon} alt="Brightness Icon" width={20} height={20} />{brightnessStatus}</span>
                </div>
                <div className={styles.distanceStatus}>
                  <span><Image src={DistanceIcon} alt="Distance Icon" width={20} height={20} />{distanceStatus}</span>
                </div>
                <div>
                  <p>{faceStatus}</p>
                </div>
              </div>
              <div className={styles.bpmCounter}>
                <CircularProgressbarWithChildren 
                  className={styles.progressBar} 
                  value={(bufferIndex * 100) / MAX_BUFFER_INDEX}
                  styles={buildStyles({
                    strokeLinecap: 'butt',
                    pathTransitionDuration: 0.1,
                    transition: 'stroke-dashoffset 0.5s ease 0s',
                    transform: 'rotate(0.25turn)',
                    transformOrigin: 'center center',
                    pathColor: `rgba(222, 0, 56, ${bufferIndex / 100})`,
                    trailColor: '#ffebeb',
                  })}
                >
                  <Image src={hearBeat} alt='Heart Beat' />
                  <span>{bpm}</span>
                </CircularProgressbarWithChildren>
              </div>
              <div>
                <div className={styles.stopCounter}>
                  <LinearProgress 
                  determinate value={(timer/10)*100} 
                  size="lg"
                  sx={{
                    "--LinearProgress-thickness": "30px",
                    color: 'rgb(222, 0, 56)',
                    bgcolor: 'rgb(222, 0, 56, 0.1)',
                    width: '80%',
                  }}
                  />
                </div>
                <div className={styles.stopCounter}>
                  <button disabled={!isButtonClickable} onClick={handleShowBpm} className={isButtonClickable ? styles.stopButton : styles.stopButtonDisabled}>
                    Stop
                  </button>
                </div>
                <div className={styles.tButton}>
                  <span>Toggle EVM Camera<br/></span>
                <Switch 
                  onChange={toggleButton}
                  checked={isBpmVideo}
                  offHandleColor="#fff"
                  offColor="#959595"
                  onColor="#FCE5EB"
                  onHandleColor="#DE0038"
                  handleDiameter={30}
                  uncheckedIcon={false}
                  checkedIcon={false}
                  boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                  activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                  height={20}
                  width={48}
                  className="react-switch"
                  id="material-switch"
                />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}