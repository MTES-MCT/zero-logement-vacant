import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

function App() {
  return (
    <React.Suspense fallback={<></>}>
      <BrowserRouter>
        <Switch>
          <Route>
            <h1>Hello, World!</h1>
          </Route>
        </Switch>
      </BrowserRouter>
    </React.Suspense>
  )
}

export default App;
