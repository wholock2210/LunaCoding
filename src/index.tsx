import React from "react";
import { render } from "ink";
import App from './ui/app.js'

const {waitUntilExit} = render(<App/>);

waitUntilExit().then(() => {
	console.log('app exit');
});

