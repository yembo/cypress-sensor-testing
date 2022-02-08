# Test Data
This folder contains pre-recorded test data for purposes of automatically testing sensor data processing algorithms. It can be used to run regression testing on code that monitors physical sensors. 

The data was captured on physical iOS and Android devices using a modified version of the [Mariner Consumer build](https://github.com/yembo/service-mariner-consumer/blob/dc5eb2be12fd6c5087c7a140967ae6c22ef3a9ec/app/src/react/video/recorders/WebRtc/sensors/imu.js).

## IMU
The camera recorder has realtime IMU monitoring to detect when motion is too fast that the AI is likely to fail in postprocessing. 

The sensor data is captured at 20 Hz (one data packet every 50ms).

Several test cases are provided: 

### Android 12 - Samsung Galaxy S21
- [20s recording, all good](cypress/fixtures/android-12-galaxy-s21-20s-all-good.json20s-all-good.json)
- [20s recording, good from 0-10s, bad from 10-12s, good again from 12-20s](cypress/fixtures/android-12-galaxy-s21-20s-bad-10-to-12s.jsonad-10-to-12s.json)
- [20s recording, all bad](cypress/fixtures/android-12-galaxy-s21-20s-all-bad.json-20s-all-bad.json)

### iOS 15.1 - iPhone SE2
- [20s recording, all good](cypress/fixtures/ios-15-1-iphone-se2-20s-all-good.json20s-all-good.json)
- [20s recording, good from 0-10s, bad from 10-12s, good again from 12-20s](cypress/fixtures/ios-15-1-iphone-se2-20s-bad-10-to-12s.jsonad-10-to-12s.json)
- [20s recording, all bad](cypress/fixtures/ios-15-1-iphone-se2-20s-all-bad.json-20s-all-bad.json)

## Lightness
The camera recorder does lightness detection on the camera feed during the countdown period. If the camera frame is too dark, a prompt is shown for the user to fix the lighting. Several sample images are provided:

- [Good 1](cypress/fixtures/lightness-good-1.jpghtness-good-1.jpg)
- [Good 2](cypress/fixtures/lightness-good-2.jpghtness-good-2.jpg)
- [Too dark 1](cypress/fixtures/lightness-too-dark-1.jpgss-too-dark-1.jpg)
- [Too dark 2](cypress/fixtures/lightness-too-dark-2.jpgss-too-dark-2.jpg)

# How to use the data
## IMU 
The camera recorder tracks the total duration of the recording and the total time the camera feed is spent in a "bad" state. A "bad" state is defined to be the proportion of the time the [magnitude](https://en.wikipedia.org/wiki/Magnitude_(mathematics)) of the (x, z) acceleration vector
is over 8 [m/s^2](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/acceleration). Astute readers may note that this threshold is close to the acceleration due to gravity on [Venus](https://phys.org/news/2016-01-strong-gravity-planets.html), but unfortunately this is coincidental - the number was derived through an analysis of AI failure scenarios on Mariner recordings.

The [y-axis](https://developers.google.com/web/fundamentals/native-hardware/device-orientation#device_coordinate_frame) is omitted because (i) this algorithm is CPU-constrained - it's running on a mobile device while recording is happening in a lossy format, and dropping too many frames adversely affects the AI performance, and (ii) from testing on the Mariner side, users rarely tend to move significantly along this axis anyway.

## Lightness
Lightness detection is more processing intensive than the IMU, so it only runs during the initial countdown period (while the 3...2...1... is being displayed in the UI). The camera image is converted to grayscale and the average pixel intensity is calculated (0%: flat black, 100%: pure white). If the intensity is under 50%, the lightness warning is shown.

Since lightness tends to vary throughout the room, the sensor reading here is less deterministic of a bad video. As a result, we show the lightness warning once per video - once the prompt has been shown and the user dismisses, the algorithm does not run again until the next video is recorded. This prevents the user from getting caught in a loop if the starting frames of the room are dark. 
