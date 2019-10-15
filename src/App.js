import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';
import styled from "styled-components";

const AppStyled = styled.div`
`

class App extends React.Component {

  constructor(props) {
    super(props);
    this.videosSubreddit = 'videos';
    this.artisanSubreddit = 'artisanvideos';
    this.documentarySubreddit = 'documentaries';
    this.haikuSubreddit = 'youtubehaiku';
    this.subredditsArray = ['mealtimevideos', 'music',];
    this.url = 'https://www.reddit.com/';
    this.sorts = ['hot', 'new', 'top', 'controversial', 'rising'];
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
    this.setState({
      files: [],
      currentSubreddit: sub,
      page: 1
    });
    fetch(this.url + 'r/' + sub + "/" + this.state.sort + '.json')

      .then(res => res.json())
      .then((data) => {

        var array = data.data.children;
        var index = 0;
        var files = [];
        for (index = 0; index < array.length; index++) {
          if (array[index].data.domain === "youtube.com" | array[index].data.domain === "youtu.be" | array[index].data.domain === "m.youtube.com" && !array[index].data.url.includes('/channel/')) {
            files.push(array[index])
          }
        }

        this.setState({
          files: files,
          after: data.data.after,
          before: data.data.before
        });
        window.scrollTo(0, 0);
      })
      .catch(console.log)
  }

  changeSort(sort) {
    this.setState({
      files: [],
      sort: sort,
      page: 1
    })
    fetch(this.url + this.state.currentSubreddit + "/" + sort + '.json')
      .then(res => res.json())
      .then((data) => {

        var array = data.data.children;
        var index = 0;
        var files = [];
        for (index = 0; index < array.length; index++) {
          if (array[index].data.domain === "youtube.com" | array[index].data.domain === "youtu.be" | array[index].data.domain === "m.youtube.com" && !array[index].data.url.includes('/channel/')) {
            files.push(array[index])
          }
        }

        this.setState({
          files: data.data.children,
          after: data.data.after,
          before: data.data.before
        });
        window.scrollTo(0, 0);
      })
      .catch(console.log)
  }

  searchSubreddit(subreddit) {
    if (subreddit.length !== 0) {
      this.changeSubreddit(subreddit);
    } else {
      this.changeSubreddit(this.videosSubreddit);
    }
  }

  render() {
    let currentSubreddit;
    if (this.state.currentSubreddit === this.videosSubreddit) {
      currentSubreddit = "Videos";
    } else if (this.state.currentSubreddit === this.documentarySubreddit) {
      currentSubreddit = "Documentaries";
    } else if (this.state.currentSubreddit === this.artisanSubreddit) {
      currentSubreddit = "Artisan Videos";
    } else if (this.state.currentSubreddit === this.haikuSubreddit) {
      currentSubreddit = "YouTube Haiku";
    } else {
      currentSubreddit = "r/" + this.state.currentSubreddit;
    }

    return (
      <AppStyled>
        <header className="App-header">
          <h1 className="headline">Vumble 2</h1>
          <div className="list-sort">
            <div className="dropdown m-2" style={{ display: "inline" }}>
              <button className="btn btn-outline-success dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                {currentSubreddit} &nbsp;
              </button>
              <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                <a className="dropdown-item" href="#subChange" onClick={() => this.changeSubreddit(this.videosSubreddit)}>r/videos</a>
                <a className="dropdown-item" href="#subChange" onClick={() => this.changeSubreddit(this.documentarySubreddit)}>r/documentaries</a>
                <a className="dropdown-item" href="#subChange" onClick={() => this.changeSubreddit(this.artisanSubreddit)}>r/artisanvideos</a>
                <a className="dropdown-item" href="#subChange" onClick={() => this.changeSubreddit(this.haikuSubreddit)}>r/youtubehaiku</a>
                {this.subredditsArray.map((subreddit, index) => (
                  <a className="dropdown-item" key={index} href="#subChange" onClick={() => this.changeSubreddit(subreddit)}>r/{subreddit}</a>
                ))}
              </div>
            </div>
          </div>
        </header>
        <div>
          <VideoList files={this.state.files} />
        </div>
      </AppStyled>
    );
  }


}

export default App;
