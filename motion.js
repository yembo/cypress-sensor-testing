const sensor = {
    dom: {},
    status: 'unknown',
    statusText: null,

    // Log buffer for displaying most recent entries in the UI
    log: [],
    MAX_LOG_LENGTH: 10,

    // Limits on vector sum of motion events
    ACCELERATION_THRESHOLD: 8,
    ANGLE_CHANGE_THRESHOLD: 200,

    /* Consider the reading to be "bad" if this many consecutive events are bad.
     * This smooths out spurious/noisy samples */
    BAD_MOTION_CONSECUTIVE_THRESHOLD: 1,

    attachEventHandlers: () => {
        sensor.dom.$sensorControl = document.getElementById("sensor-control");
        sensor.dom.$sensorStatus = document.getElementById("sensor-status");
        sensor.dom.$logWrapper = document.getElementById("log-wrapper");
        sensor.dom.$log = document.getElementById("log");

        // Button either starts or stops analysis, depending on state
        sensor.dom.$sensorControl.onclick = (e) => {
            switch (sensor.status) {
                case 'analyzing':
                    sensor.stopAnalysis();
                    break;
                case 'unknown':
                default:
                    sensor.handlePermissions();
                    break;
            }
        };
    },

    // Update UI and start analyzing sensor data
    onPermissionGranted: () => {
        sensor.status = 'analyzing';

        sensor.dom.$sensorStatus.className = 'success';
        sensor.dom.$sensorStatus.innerText = '📊 Analyzing data...';

        sensor.dom.$sensorControl.innerText = 'Stop Analyzing';

        sensor.requestMotionData();
    },

    // Show permission error
    onPermissionDenied: () => {
        sensor.status = 'failed';
        sensor.dom.$sensorStatus.className = 'error';
        sensor.dom.$sensorStatus.innerText = '🚨 Permission denied';
    },

    // Show unsupported browser error
    onUnsupportedBrowserDetected: () => {
        sensor.status = 'failed';
        sensor.dom.$sensorStatus.className = 'error';
        sensor.dom.$sensorStatus.innerText = '🚨 Sorry, your browser doesn\'t support monitoring accelerometer data.';
    },

    // Request motion data from the browser
    requestMotionData: () => {
        sensor.dom.$logWrapper.style.display = 'block';
        sensor.dom.$log.innerText = 'Waiting for motion data...';

        window.addEventListener('devicemotion', sensor.handleMotion);
    },

    // Calculate magnitude of a vector
    calcVectorMagnitude: (x, y, z) => {
        return Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2);
    },

    isMotionOk: (event) => {
        let isAccelerationOk = true;
        let isRotationOk     = true;

        // Rotation around each axis cannot be too fast
        const {alpha, beta, gamma} = event.rotationRate ?? {};
        const gyroscopeSum = sensor.calcVectorMagnitude(alpha, beta, gamma);
        if (gyroscopeSum > sensor.ANGLE_CHANGE_THRESHOLD) {
            isRotationOk = false;
        }

        // Linear acceleration cannot be too fast
        const {x, y, z} = event.acceleration ?? {};
        const accelerometerSum = sensor.calcVectorMagnitude(x, y, z);
        if (accelerometerSum > sensor.ACCELERATION_THRESHOLD) {
            isAccelerationOk = false;
        }

        // Motion is ok if both quantities are within allowable limits
        const isInstantaneousMotionOk = isAccelerationOk && isRotationOk;

        if (isInstantaneousMotionOk) {
            sensor.numConsecutiveBadMotionCounts = 0;
        } else {
            sensor.numConsecutiveBadMotionCounts++;
        }

        /* Consider the overall motion to be in a bad state if too many consecutive bad readings
         * have been detected */
        return (sensor.numConsecutiveBadMotionCounts < sensor.BAD_MOTION_CONSECUTIVE_THRESHOLD);
    },

    handleMotion: (event) => {
        const isMotionOk = sensor.isMotionOk(event);

        const now = new Date().toISOString();
        const x = event.acceleration.x;
        const y = event.acceleration.y;
        const z = event.acceleration.z;
        const alpha = event.rotationRate.alpha;
        const beta = event.rotationRate.beta;
        const gamma = event.rotationRate.gamma;
        const result = isMotionOk ? 'ok' : 'too fast';

        const logPacket = `timestamp: ${now}\n\tx: ${x}\n\ty: ${y}\n\tz: ${z}\n\tα: ${alpha}\n\tβ: ${beta}\n\tγ: ${gamma}\n\tresult: ${result}\n`;

        // Treat log as a circular buffer, otherwise text will get way too long and page will hang
        sensor.log.unshift(logPacket);
        if (sensor.log.length > sensor.MAX_LOG_LENGTH) {
            sensor.log.pop();
        }

        // Update UI to reflect motion analysis status
        sensor.dom.$log.innerText = sensor.log.join("\n");
        if (isMotionOk) {
            sensor.dom.$sensorStatus.className = 'success';
            sensor.dom.$sensorStatus.innerText = '✅ Speed ok';
        } else {
            sensor.dom.$sensorStatus.className = 'warning';
            sensor.dom.$sensorStatus.innerText = '🐌 Slow down, partner';
        }
    },

    handlePermissions: () => {
        /* Not all browsers require permission to access motion events. Check if the function to request
         * permission exists, and call it if so. */
        const isPermissionCheckNeeded = typeof DeviceMotionEvent.requestPermission === 'function';

        if (isPermissionCheckNeeded) {
            DeviceMotionEvent.requestPermission().then(permissionState => {
                if (permissionState === 'granted') {
                    sensor.onPermissionGranted();
                }
            }).catch(sensor.onPermissionDenied);
        } else {
            if (window.DeviceMotionEvent === null) {
                sensor.onUnsupportedBrowserDetected();
            } else {
                sensor.onPermissionGranted();
            }
        }
    },

    // Stop collecting and analyzing data, and update UI to reflect the change
    stopAnalysis: () => {
        sensor.status = 'completed';

        sensor.dom.$sensorStatus.className = 'inactive';
        sensor.dom.$sensorStatus.innerText = '😴 Analysis inactive';

        sensor.dom.$sensorControl.innerText = 'Start Analyzing';
        window.removeEventListener('devicemotion', sensor.handleMotion);
    },

};

window.onload = () => {
    window.sensor = sensor; // For debugging
    sensor.attachEventHandlers();
};
