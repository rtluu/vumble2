import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';
import styled from "styled-components";

const AppStyled = styled.div`
  header{
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: 2rem 2.5%;
    position: relative;
    z-index: 5;

    @media (max-width: 60rem) {
        margin: 2rem 3.33%;
    }

    @media (max-width: 40rem) {
        margin: 1rem 5%;
    }

    .headline{
      position: absolute;
      left: 50%;
      transform: translate(-50%);
    }


    .sub-sort{
      display: inline-block;
      position: relative;
      
      .dropdown{
        position: relative;

        .dropdown-toggle{
          align-items: center;
          display: flex;
          justify-content: center;
          font-size: 1.125rem;
          transition: all 0.1s;

          @media (hover: hover) {
            &:hover{
              background: black;
              color: white;

              .down-arrow{
                border-color: white;
              }
            }
          }

          &.active{
            background: black;
            color: white;

            .down-arrow{
              border-color: white;
            }
          }

          .down-arrow{
            box-sizing: border-box;
            border-style: solid;
            border-color: black;
            border-width: 0 0.125rem 0.125rem 0;
            display: inline-block;
            height: 0.5rem;
            margin-left: 0.25rem;
            transform: rotate(45deg) translateY(-0.0675rem);
            width: 0.5rem;
            transition: all 0.1s;
          }
        }
    
        .dropdown-menu{
          background: white;
          border-radius: 0.25rem;
          box-shadow: 0 0.125rem 0.25rem 0 rgba(0,0,0,0.5);
          display: none;
          flex-direction: column;
          position: absolute;

          &.open{
            display: flex;
          }

          .dropdown-item{
            color: black;
            padding: 0.5rem;
            font-size: 1.125rem;

            @media (hover: hover) {
              &:hover{
                background: black;
                color: white;
              }
            }
          }
        } 
      }
    }
  }
`

class App extends React.Component {

  constructor(props) {
    super(props);
    this.videosSubreddit = 'videos';
    this.artisanSubreddit = 'artisanvideos';
    this.documentarySubreddit = 'documentaries';
    this.haikuSubreddit = 'youtubehaiku';
    this.subredditsArray = ['mealtimevideos', 'music', 'woahdude'];
    this.url = 'https://www.reddit.com/';
    this.sorts = ['hot', 'new', 'top'];

    this.dropdownSub = this.dropdownSub.bind(this);
    this.dropdownSort = this.dropdownSort.bind(this);
  }

  state = {
    currentSubreddit: 'videos',
    files: [],
    page: 1,
    after: null,
    before: null,
    sort: 'hot',

    dropdownOpen: false,
  };

  componentDidMount() {
    this.changeSubreddit(this.state.currentSubreddit);
  }

  changeSubreddit(sub) {
    this.setState({
      files: [],
      currentSubreddit: sub,
      page: 1,
      dropdownOpen: false
    });
    fetch(this.url + 'r/' + sub + "/" + this.state.sort + '.json')

      .then(res => res.json())
      .then((data) => {

        var array = data.data.children;
        var index = 0;
        var files = [];
        for (index = 0; index < array.length; index++) {
          if (array[index].data.domain === "youtube.com" | array[index].data.domain === "youtu.be" | array[index].data.domain === "m.youtube.com" && !array[index].data.url.includes('/channel/') && !array[index].data.url.includes('/playlist')) {
            files.push(array[index])
          } else {
            console.log(array[index]);
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
      page: 1,
      dropdownOpen: false
    })
    fetch(this.url + 'r/' + this.state.currentSubreddit + "/" + sort + '.json')
      .then(res => res.json())
      .then((data) => {

        var array = data.data.children;
        var index = 0;
        var files = [];
        for (index = 0; index < array.length; index++) {
          if (array[index].data.domain === "youtube.com" | array[index].data.domain === "youtu.be" | array[index].data.domain === "m.youtube.com" && !array[index].data.url.includes('/channel/') && !array[index].data.url.includes('/playlist')) {
            files.push(array[index])
            console.log('pushed', array[index].data.domain);
          } else {

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

  searchSubreddit(subreddit) {
    if (subreddit.length !== 0) {
      this.changeSubreddit(subreddit);
    } else {
      this.changeSubreddit(this.videosSubreddit);
    }
  }

  dropdownSub() {
    this.setState({ dropdownSub: !this.state.dropdownSub });
  }

  dropdownSort() {
    this.setState({ dropdownSort: !this.state.dropdownSort });
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
      currentSubreddit = "" + this.state.currentSubreddit;
    }

    var dropdown = {};
    if (this.state.dropdownSub) {
      dropdown.toggleSub = "dropdown-toggle active"
      dropdown.menuSub = "dropdown-menu open"
    } else {
      dropdown.toggleSub = "dropdown-toggle"
      dropdown.menuSub = "dropdown-menu"
    }
    if (this.state.dropdownSort) {
      dropdown.toggleSort = "dropdown-toggle active"
      dropdown.menuSort = "dropdown-menu open"
    } else {
      dropdown.toggleSort = "dropdown-toggle"
      dropdown.menuSort = "dropdown-menu"
    }
    return (
      <AppStyled>
        <header className="App-header">
          <h1 className="headline">Vumble</h1>
          <div className="sub-sort">
            <div className="dropdown">
              <button className={dropdown.toggleSub} onClick={this.dropdownSub} type="button">r/{currentSubreddit}<span className="down-arrow" /></button>
              <div className={dropdown.menuSub}>
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

          <div className="sub-sort">
            <div className="dropdown" >
              <button className={dropdown.toggleSort} onClick={this.dropdownSort} type="button" >{this.state.sort}</button>
              <div className={dropdown.menuSort} aria-labelledby="dropdownMenuButton">
                {this.sorts.map((sort, index) => (
                  <a className="dropdown-item" key={index} href="#subChange" onClick={() => this.changeSort(sort)}>{sort}</a>
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
