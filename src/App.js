import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';

class App extends React.Component {

  constructor(props) {
    super(props);

    this.url = 'https://www.reddit.com/r/';
  }

  state = {
    currentSubreddit: 'videos',
    files: [],
    page: 1,
    after: null,
    before: null,
    sort: 'hot',
  };

  componentDidMount() {
    this.changeSubreddit(this.state.currentSubreddit);

  }

  changeSubreddit(sub) {
    /* 
     * Empty the files so we will show 'Loading...'
     * Reset page to 1
     */
    this.setState({
      files: [],
      currentSubreddit: sub,
      page: 1
    });
    fetch(this.url + sub + "/" + this.state.sort + '.json')
      .then(res => res.json())
      .then((data) => {
        this.setState({
          files: data.data.children,
          after: data.data.after,
          before: data.data.before
        });
        window.scrollTo(0, 0);
      })
      .catch(console.log)
  }

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
