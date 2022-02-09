/// <reference types="cypress" />

describe('Sensor testing', () => {
    it(`Should pass recorded motion event tests`, () => {

        // Return a human-readable string for motion classification
        const getMotionClassification = (isMotionOk) => {
            return isMotionOk ? 'ok' : 'not ok';
        }

        // Determine what acceptable motion classifications are at a given point in time
        const getAcceptableMotionStatuses = (timestamp, recording) => {
            const acceptableStatuses = [];
            let prevExpectation      = null;

            for (const expectation of recording.expectations.timeline) {
                if ((timestamp >= expectation.start) && (timestamp <= expectation.end)) {
                    // The expected motion classification for the timestamp is acceptable
                    acceptableStatuses.push(getMotionClassification(expectation.isMotionOk));

                    /* If the motion classification is within the hysteresis window from the previous
                     * expectation, then also call the previous's window's expectation */
                    if (prevExpectation && ((prevExpectation.end + recording.expectations.hysteresis) >= timestamp)) {
                        const prevClassification = getMotionClassification(prevExpectation.isMotionOk);
                        if (!acceptableStatuses.includes(prevClassification)) {
                            acceptableStatuses.push(getMotionClassification(prevClassification));
                        }
                    }

                    // No need to process further once the current timestamp has been located
                    break;
                }

                prevExpectation = expectation;
            }

            return acceptableStatuses;
        }

        // Navigate to the page, click the button, and confirm the UI is responsive
        cy.visit('/index.html');
        
        // Play back each recorded motion file and compare UI to expectations
        const MS_PER_DATA_SAMPLE = 50;

        const recordingFiles = [
           // "android-12-galaxy-s21-20s-all-good.json",
            "android-12-galaxy-s21-20s-all-bad.json"
        ];

        for (const recordingFile of recordingFiles) {
            // Start collecting data
            cy.get('[id="sensor-control"]').click();
            cy.get('[id="sensor-status"]').should('include.text','Analyzing data');

            cy.log(`Playing back recorded motion data file: ${recordingFile}`);

            // Test each recording file one at a time
            cy.fixture(recordingFile).then((recording) => {
                // Feed each data packet into the page one at a time
                recording.data.forEach((packet) => {
                    cy.window().then((window) => {
                        /* Since the algorithm may rely on wall clock time, actually wait the appropriate amount of
                         * time before feeding the next data point. Otherwise new Date().getTime() will be skewed. */
                        cy.wait(MS_PER_DATA_SAMPLE);

                        // Build a synthetic DeviceMotionEvent from the recorded data
                        const options = {
                            acceleration: packet.acceleration,
                            accelerationIncludingGravity: packet.accelerationIncludingGravity,
                            interval: MS_PER_DATA_SAMPLE,
                            rotationRate: packet.rotationRate
                        };
                        const deviceMotionEvent = new DeviceMotionEvent("devicemotion", options);

                        const acceptableStatuses = getAcceptableMotionStatuses(packet.timestamp, recording);

                        // Print a log line to make it easier to track where things went wrong if the test were to fail
                        cy.log(`Processing packet @ ${packet.timestamp} ms, acceptable statuses: ${acceptableStatuses.join(', ')}`);

                        // Pass the synthetic data into the window on the target page
                        // @ts-ignore
                        window.sensor.handleMotion(deviceMotionEvent);
                        
                        // Expect the UI to reflect in tandem with the changes to motion
                        if (acceptableStatuses.length > 1) {
                            // If both statuses are acceptable, ust confirm the status is visible but don't check its value
                            cy.get('[id="sensor-status"]').should('be.visible');
                        }
                        // If the only acceptable motion status is "ok", then the UI should reflect that
                        else if (acceptableStatuses.includes('ok')) {
                            cy.get('[id="sensor-status"]').should('include.text','Speed ok');
                        }
                        // If the only acceptable motion status is "not ok", then the UI should reflect that
                        else if (acceptableStatuses.includes('not ok')) {
                            cy.get('[id="sensor-status"]').should('include.text','Slow down, partner');
                        }
                    });
                });
            });

            // Reset the test back to inactive before the next test
            cy.get('[id="sensor-control"]').click();
            cy.get('[id="sensor-status"]').should('include.text','Analysis inactive');
        }
    });
});
