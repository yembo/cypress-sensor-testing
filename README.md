# To run the Cypress tests

## Install and start the web server
```
npm install
npm i -g http-server
npm start
```

## Open Cypress
```
npm run cy:open
```

# To collect motion data from your mobile device
1. `npm start`
2. `ngrok http 8080`
3. Navigate to the `collect.html` page via https link to your ngrok URL on your mobile device, e.g.: https://yembo-motion.ngrok.io/collect.html
4. Collect the data, then send to your device (e.g., copy/paste to pastebin)
