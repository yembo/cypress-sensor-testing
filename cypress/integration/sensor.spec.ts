/// <reference types="cypress" />

describe('Sensor testing', () => {
    it(`Should pass recorded motion event tests`, () => {

        // Return a human-readable string for motion classification
        const getMotionClassification = (isMotionOk) => {
            return isMotionOk ? 'ok' : 'not ok';
        };

        // Determine what acceptable motion classifications are at a given point in time
        const getAcceptableMotionStatuses = (timestamp, recording) => {
            const acceptableStatuses = [];
            for (let i = 0; i < recording.expectations.timeline.length; i++) {
                let prevExpectation = null;
                const expectation = recording.expectations.timeline[i];
                let nextExpectation = null;

                if (i > 0) {
                    prevExpectation = recording.expectations.timeline[i - 1];
                }

                if (i < (recording.expectations.timeline.length - 1)) {
                    nextExpectation = recording.expectations.timeline[i + 1];
                }

                if ((timestamp >= expectation.start) && (timestamp <= expectation.end)) {
                    let prevStart = '--';
                    let prevEnd   = '--';

                    if (prevExpectation) {
                        prevStart = prevExpectation.start;
                        prevEnd   = prevExpectation.end;
                    }

                    let nextStart = '--';
                    let nextEnd   = '--';

                    if (nextExpectation) {
                        nextStart = nextExpectation.start;
                        nextEnd   = nextExpectation.end;
                    }

                    cy.log(`prev: ${prevStart} to ${prevEnd}, curr: ${expectation.start} to ${expectation.end}, next: ${nextStart} to ${nextEnd}`);

                    // The expected motion classification for the timestamp is acceptable
                    acceptableStatuses.push(getMotionClassification(expectation.isMotionOk));

                    /* If the motion classification is within the hysteresis window from the previous
                     * expectation, then also consider the previous's window's expectation */
                    if (prevExpectation) {
                        if ((prevExpectation.end + recording.expectations.hysteresis) >= timestamp) {
                            cy.log('Also allowing hysteresis from prev expectation');

                            const prevClassification = getMotionClassification(prevExpectation.isMotionOk);
                            if (!acceptableStatuses.includes(prevClassification)) {
                                acceptableStatuses.push(prevClassification);
                            }
                        }
                    }
                    else { // If there is no previous classification, allow hysteresis during start of test
                        if (recording.expectations.hysteresis >= timestamp) {
                            cy.log('Allowing hysteresis at start of test');

                            if (!acceptableStatuses.includes('ok')) {
                                acceptableStatuses.push('ok');
                            }

                            if (!acceptableStatuses.includes('not ok')) {
                                acceptableStatuses.push('not ok');
                            }
                        }
                    }

                    /* If the motion classification is within the hysteresis window from the next
                     * expectation, then also consider the next's window's expectation */
                    if (nextExpectation) {
                        if ((nextExpectation.start - recording.expectations.hysteresis) <= timestamp) {
                            cy.log('Also allowing hysteresis from next expectation');
                            const nextClassification = getMotionClassification(nextExpectation.isMotionOk);
                            if (!acceptableStatuses.includes(nextClassification)) {
                                acceptableStatuses.push(nextClassification);
                            }
                        }
                    }

                    // No need to process further once the current timestamp has been located
                    break;
                }

                prevExpectation = expectation;
            }

            return acceptableStatuses;
        };

        // Navigate to the page, click the button, and confirm the UI is responsive
        cy.visit('/index.html');
        
        const recordingFiles = [
            //"android-12-galaxy-s21-20s-all-good.json",
            //"android-12-galaxy-s21-20s-all-bad.json",
            "android-12-galaxy-s21-20s-bad-10-to-12s.json"          
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
                        cy.wait(packet.interval).then(() => {
                            // Build a synthetic DeviceMotionEvent from the recorded data
                            const options = {
                                acceleration: packet.acceleration,
                                accelerationIncludingGravity: packet.accelerationIncludingGravity,
                                interval: packet.interval,
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
                                // If both statuses are acceptable, just confirm the status is visible but don't check its value
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
            });

            // Reset the test back to inactive before the next test
            cy.get('[id="sensor-control"]').click();
            cy.get('[id="sensor-status"]').should('include.text','Analysis inactive');
        }
    });
});
