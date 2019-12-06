import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import About from './About';
import * as serviceWorker from './serviceWorker';

import { HashRouter, Link, Route } from 'react-router-dom';
import { createBrowserHistory } from "history"

ReactDOM.render(

    <HashRouter >
        <div>
            <Route exact path="/" component={App} />
            <Route exact path="/about" component={About} />
        </div>
    </HashRouter>
    ,
    document.getElementById('root')
);






// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
