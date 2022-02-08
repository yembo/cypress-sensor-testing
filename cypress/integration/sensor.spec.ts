/// <reference types="cypress" />

import * as sensor from "../../motion"

describe('Sensor testing', () => {
    const interval = 50; // 20hz interval for reading/sending motion events
    const recordings = [
        "android-12-galaxy-s21-20s-all-good_v2.json"
    ]

    it(`Should test good accelerator readings`, () => {
        const fileName = "android-12-galaxy-s21-20s-all-good_v2.json";
        cy.fixture(fileName).then((data) => {
            data.forEach((d) => {
                const options = {
                    acceleration: {x: d.x, y: d.y, z: d.z},
                    accelerationIncludingGravity: {x: d.x, y: d.y, z: d.z},
                    interval: null,
                    rotationRate: {alpha: 1, beta: 1, gamma: 1}
                };
                const deviceMotionEvent = new DeviceMotionEvent("devicemotion", options);

                // feed synthetic data
                sensor.handleMotion(deviceMotionEvent)

                // logic to verify results

            });
        })
    });

    it.skip('Should test accelerometer on media page', () => {
        cy.visit('index.html')
        cy.get('[id="sensor-control"]').click()

        cy.get('[id="sensor-status"]').should('include.text','Analyzing data')
    });
});
