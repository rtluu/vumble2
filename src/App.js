import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';

class App extends React.Component {

  constructor(props) {
    super(props);
  }

  state = {
    files: ['MRyLC2M1K2w', 'L7DWWwdPDgk', 'j1qUfM8BmcI']
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Vumble 2</h1>
        </header>
        <div>
          <VideoList files={this.state.files} />
        </div>
      </div>
    );
  }


}

export default App;
