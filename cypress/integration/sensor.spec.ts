/// <reference types="cypress" />

describe('Sensor testing', () => {
    const basePath = './test-data';
    const interval = 50; // 20hz interval for reading/sending motion events
    const recordings = [
        "android-12-galaxy-s21-20s-all-good_v2.json"
    ]

    // it.skip(`Should test good accelerator readings`, () => {
    //     const fileName = "android-12-galaxy-s21-20s-all-good_v2.json";
    //     const filePath = `${basePath}/${fileName}`;
    //     cy.readFile(filePath).then((data) => {
    //         data.forEach((d) => {
    //             const options = {
    //                 acceleration: {x: d.x, y: d.y, z: d.z},
    //                 accelerationIncludingGravity: {x: d.x, y: d.y, z: d.z},
    //                 interval: null,
    //                 rotationRate: {alpha: 1, beta: 1, gamma: 1}
    //             };
    //             const deviceMotionEvent = new DeviceMotionEvent("devicemotion", options);
    //
    //             // feed synthetic data
    //             Sensor.handleMotionEvent(deviceMotionEvent)
    //
    //             //delay before sending next data
    //             cy.wait(interval)
    //         });
    //     })
    // });

    it('Should test accelerometer on media page', () => {
        cy.visit('index.html')
        cy.get('[id="sensor-control"]').click()

        cy.get('[id="sensor-status"]').should('include.text','Analyzing data')
    });
});
