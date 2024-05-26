import numpy as np
import time
import cv2
from flask import Flask, Response, request
from flask_socketio import SocketIO
from threading import Lock

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

# Helper Methods
def buildGauss(frame, levels):
    pyramid = [frame]
    for level in range(levels):
        frame = cv2.pyrDown(frame)
        pyramid.append(frame)
    return pyramid

def reconstructFrame(pyramid, index, levels):
    filteredFrame = pyramid[index]
    for level in range(levels):
        filteredFrame = cv2.pyrUp(filteredFrame)
    filteredFrame = filteredFrame[:videoHeight, :videoWidth]
    return filteredFrame

def check_brightness(frame, dark_threshold=50, bright_threshold=200):
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    avg_brightness = np.mean(gray_frame)
    if avg_brightness < dark_threshold:
        return "Too Dark"
    elif avg_brightness > bright_threshold:
        return "Too Bright"
    else:
        return "Normal"
    
def check_distance(face_width, face_height, frame_width, frame_height):
    # Calculate the size of the detected face bounding box
    face_size = face_width * face_height

    # Define minimum and maximum face sizes for acceptable distance
    min_face_size = (frame_width * frame_height) * 0.05  # 5% of frame size
    max_face_size = (frame_width * frame_height) * 0.25  # 25% of frame size

    # Check if the face size is within the acceptable range
    if min_face_size < face_size < max_face_size:
        return "Normal"
    elif face_size < min_face_size:
        return "Too Far"
    else:
        return "Too Close"

#### Add timer for 1 second when scanning is interupted

# Webcam Parameters
webcam = cv2.VideoCapture(1)
realWidth = 640
realHeight = 480
videoWidth = 320
videoHeight = 240
videoChannels = 3
videoFrameRate = 30
webcam.set(3, realWidth)
webcam.set(4, realHeight)
alphaColor = 0.4

# Output Videos
outputVideoFilename = "output.mov"
outputVideoWriter = cv2.VideoWriter(outputVideoFilename, cv2.VideoWriter_fourcc('M','J','P','G'), videoFrameRate, (realWidth, realHeight), True)

# Color Magnification Parameters
levels = 3
alpha = 170
minFrequency = 1.0
maxFrequency = 2.0
bufferSize = 150
bufferIndex = 0
boxColor = (0, 255, 0)
boxWeight = 1

# Initialize Gaussian Pyramid
firstFrame = np.zeros((videoHeight, videoWidth, videoChannels))
firstGauss = buildGauss(firstFrame, levels+1)[levels]
videoGauss = np.zeros((bufferSize, firstGauss.shape[0], firstGauss.shape[1], videoChannels))
fourierTransformAvg = np.zeros((bufferSize))

# Bandpass Filter for Specified Frequencies
frequencies = (1.0*videoFrameRate) * np.arange(bufferSize) / (1.0*bufferSize)
mask = (frequencies >= minFrequency) & (frequencies <= maxFrequency)

# Heart Rate Calculation Variables
bpmCalculationFrequency = 15
bpmBufferIndex = 0
bpmBufferSize = 5
bpmBuffer = np.zeros((bpmBufferSize))

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def emit_brightness_status(bstatus):
    socketio.emit('brightness_status', {'bstatus': bstatus})

def emit_distance_status(dstatus):
    socketio.emit('distance_status', {'dstatus': dstatus})

def emit_face_status(fstatus):
    socketio.emit('face_status', {'fstatus': fstatus})

### Emit timer for interupption

# Emit BPM value and bufferIndex over WebSocket
def emit_bpm(bpm, buffer_index):
    rounded_bpm = round(bpm)  # Round BPM to the nearest whole number
    socketio.emit('bpm_update', {'bpm': rounded_bpm, 'bufferIndex': buffer_index})

def conidtionalDetect(brightness, distance, face):
    global allowBpmDetection
    if brightness == "Normal" and distance == "Normal" and face != 0:
        set_allowBpmDetection(True)
    else:
        set_allowBpmDetection(False)
    
allowBpmDetection = False
allowBpmDetectionLock = Lock()

def set_allowBpmDetection(value):
    global allowBpmDetection
    with allowBpmDetectionLock:
        allowBpmDetection = value

def get_allowBpmDetection():
    global allowBpmDetection
    with allowBpmDetectionLock:
        return allowBpmDetection

@app.route('/bpm_detection')
def bpm_detection():
    def generate(bufferIndex, bpmBufferIndex):
        global allowBpmDetection
        while True:
            ret, frame = webcam.read()
            if not ret:
                break

            detectionFrame = frame[videoHeight//2:realHeight-videoHeight//2, videoWidth//2:realWidth-videoWidth//2, :]
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

            if get_allowBpmDetection():
                videoGauss[bufferIndex] = buildGauss(detectionFrame, levels+1)[levels]
                fourierTransform = np.fft.fft(videoGauss, axis=0)
                fourierTransform[mask == False] = 0

                if bufferIndex % bpmCalculationFrequency == 0:
                    for buf in range(bufferSize):
                        fourierTransformAvg[buf] = np.real(fourierTransform[buf]).mean()
                    hz = frequencies[np.argmax(fourierTransformAvg)]
                    bpm = 60.0 * hz
                    bpmBuffer[bpmBufferIndex] = bpm
                    bpmBufferIndex = (bpmBufferIndex + 1) % bpmBufferSize

                filtered = np.real(np.fft.ifft(fourierTransform, axis=0))
                filtered = filtered * alpha

                filteredFrame = reconstructFrame(filtered, bufferIndex, levels)
                outputFrame = detectionFrame + filteredFrame
                outputFrame = cv2.convertScaleAbs(outputFrame)

                bufferIndex = (bufferIndex + 1) % bufferSize
                
                frame[videoHeight//2:realHeight-videoHeight//2, videoWidth//2:realWidth-videoWidth//2, :] = outputFrame
                cv2.rectangle(frame, (videoWidth//2 , videoHeight//2), (realWidth-videoWidth//2, realHeight-videoHeight//2), boxColor, boxWeight)

                if len(faces) == 0:
                    # No eyes detected, set bpm to 0 and font color to red
                    bpm = 0
                    bufferIndex = 0
                    # Create a transparent red rectangle
                    overlay = frame.copy()  # Create a copy of the frame
                    cv2.rectangle(overlay, (0, 5), (143, 30), (0, 0, 255), -1)  # Draw the red rectangle on the copy

                    # Blend the overlay with the frame
                    cv2.addWeighted(overlay, alphaColor, frame, 1 - alphaColor, 0, frame)
                    cv2.putText(frame, f"NO FACE FOUND", (5, 23), cv2.FONT_HERSHEY_PLAIN, 1, (255, 255, 255), 1)
                    emit_bpm(bpm, bufferIndex)
                    set_allowBpmDetection(False)
                else:
                    if bufferIndex >= bpmBufferSize:
                        # Create a transparent green rectangle
                        overlay = frame.copy()  # Create a copy of the frame
                        cv2.rectangle(overlay, (0, 5), (115, 30), (0, 255, 0), -1)  # Draw the red rectangle on the copy

                        # Blend the overlay with the frame
                        cv2.addWeighted(overlay, alphaColor, frame, 1 - alphaColor, 0, frame)
                        cv2.putText(frame, f"BPM: {round(bpmBuffer.mean())}", (5, 23), cv2.FONT_HERSHEY_PLAIN, 1, (255, 255, 255), 1)
                        
                        # Emit BPM value over WebSocket
                        emit_bpm(bpmBuffer.mean(), bufferIndex)
            else:
                bpm = 0
                bufferIndex = 0

            # Resize the frame to 600x500
            resized_frame = cv2.resize(frame, (600, 500))
                    
            ret, jpeg = cv2.imencode('.jpg', resized_frame)
            frame_bytes = jpeg.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    return Response(generate(bufferIndex, bpmBufferIndex), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/face_detection')
def face_detection():
    # Initialize face cascade classifier
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    # Initialize FPS variables
    fps_start_time = time.time()
    fps_frame_count = 0

    def generate():
        nonlocal fps_start_time, fps_frame_count
        while True:
            ret, frame = webcam.read()
            if not ret:
                break
            
            brightness_status = check_brightness(frame)
            emit_brightness_status(brightness_status)

            # Perform face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

            frame_height, frame_width = frame.shape[:2]

            for (x, y, w, h) in faces:

                face_width = w
                face_height = h

                distance_status = check_distance(face_width, face_height, frame_width, frame_height)       
                emit_distance_status(distance_status)

                if distance_status == "Too Far":
                    color = (0, 0, 255)  # Red
                elif distance_status == "Normal":
                    color = (0, 255, 0)  # Green
                elif distance_status == "Too Close":
                    color = (0, 255, 255)  # Yellow

                # Draw rectangle around faces with specified styling
                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 1)
                cv2.line(frame, (x, y), (x+int(w/10), y), color, 2)
                cv2.line(frame, (x, y), (x, y+int(h/10)), color, 2)
                cv2.line(frame, (x+w-int(w/10), y), (x+w, y), color, 2)
                cv2.line(frame, (x+w, y), (x+w, y+int(h/10)), color, 2)
                cv2.line(frame, (x, y+h), (x+int(w/10), y+h), color, 2)
                cv2.line(frame, (x, y+h-int(h/10)), (x, y+h), color, 2)
                cv2.line(frame, (x+w-int(w/10), y+h), (x+w, y+h), color, 2)
                cv2.line(frame, (x+w, y+h-int(h/10)), (x+w, y+h), color, 2)

                # Create a transparent green rectangle for the 'HEAD' label
                overlay = frame.copy()  
                cv2.rectangle(overlay, (x, y - 15), (x + 35, y), color, -1)  
                cv2.addWeighted(overlay, alphaColor, frame, 1 - alphaColor, 0, frame)
                cv2.putText(frame, 'HEAD', (x + 3, y - 4), cv2.FONT_HERSHEY_PLAIN, 0.7, (255, 255, 255), 1)

                conidtionalDetect(brightness_status, distance_status, len(faces))

            # Calculate and display FPS
            fps_frame_count += 1
            if fps_frame_count >= 30:  
                fps = fps_frame_count / (time.time() - fps_start_time)
                fps_text = f'FPS: {round(fps)}'
            else:
                fps_text = ''

            # Create a transparent green rectangle for the FPS text
            fps_overlay = frame.copy()
            cv2.rectangle(fps_overlay, (0, 3), (60, 18), (0, 0, 0), -1)
            cv2.addWeighted(fps_overlay, alphaColor, frame, 1 - alphaColor, 0, frame)
            cv2.putText(frame, fps_text, (5, 15), cv2.FONT_HERSHEY_PLAIN, 0.7, (255, 255, 255), 1)

            resized_frame = cv2.resize(frame, (600, 500))

            ret, jpeg = cv2.imencode('.jpg', resized_frame)
            frame_bytes = jpeg.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)