import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';
import styled from "styled-components";
import { Waypoint } from 'react-waypoint';

const AppStyled = styled.div`
  
  // Header Styling
  header{
    background: #2A2B2A;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    padding: .75rem 1.5rem;
    position: fixed;
    width: 100%;
    z-index: 5;

    img{
      display: block;
      max-width: 7rem;

      @media (max-width: 50rem) {
          max-width: 6rem;
      }

    }

    .sub-sort{
      display: flex;
      flex-direction: row;
      position: relative;
      margin-left: 1rem;
      
      .dropdown{
        margin: 0 0.25rem;
        position: relative;

        .dropdown-toggle{
          align-items: center;
          border-color: white;
          color: white;
          display: flex;
          justify-content: center;
          font-size: 1.125rem;
          transition: all 0.1s;

          @media (max-width: 50rem) {
            font-size: 1rem;
          }

          @media (hover: hover) {
            &:hover{
              background: white;
              color: black;

              .down-arrow{
                border-color: black;
              }
            }
          }

          &.active{
            background: white;
            color: black;

            .down-arrow{
              border-color: black;
            }
          }

          .down-arrow{
            box-sizing: border-box;
            border-style: solid;
            border-color: white;
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

  // Main Container
  .main-container{
    display: flex;
    flex-direction: column;
    justify-content: center;

    .pagination{
      display: block;
      margin: 2rem 0;
      text-align: center;

      .page-switch{
        display: inline-block;
        padding: 1rem;
        position: relative;
      }
    }
  }
`


const logo = require("./images/vumble-logo.svg");

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
    this.nextPage = this.nextPage.bind(this);
  }

  state = {
    currentSubreddit: 'woahdude',
    files: [],
    page: 1,
    after: null,
    before: null,
    sort: 'hot',

    dropdownOpen: false
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
          }
          else if (array[index].data.domain === "v.redd.it") {
            files.push(array[index])
          }
          // else if (array[index].data.domain === "gfycat.com") {
          //   files.push(array[index])
          // }
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
          }
          else if (array[index].data.domain === "v.redd.it") {
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

  nextPage = () => {
    console.log('newpage');
    fetch(this.url + 'r/' + this.state.currentSubreddit + "/" + this.state.sort + ".json?count=" + (this.state.page * 25) + "&after=" + this.state.after)
      .then(res => res.json())
      .then((data) => {
        var array = data.data.children;
        var index = 0;
        var files = this.state.files;
        for (index = 0; index < array.length; index++) {
          if (array[index].data.domain === "youtube.com" | array[index].data.domain === "youtu.be" | array[index].data.domain === "m.youtube.com" && !array[index].data.url.includes('/channel/') && !array[index].data.url.includes('/playlist')) {
            files.push(array[index])
          }
          else if (array[index].data.domain === "v.redd.it") {
            files.push(array[index])
          }
        }
        this.setState(() => ({
          files: files,
          after: data.data.after,
          before: data.data.before,
          page: this.state.page + 1
        }));
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

    let contentJSX;
    if (this.state.files.length > 0) {
      let pagingJSX;
      const buttonNext = <button className="next-button" type="submit" onClick={this.nextPage}>More</button>;
      if (this.state.before === null && this.state.after !== null) {
        // first page
        pagingJSX = <div>{buttonNext}</div>;
      } else if (this.state.before !== null && this.state.after !== null) {
        // in between pages
        pagingJSX = <div className="page-switch">{buttonNext}</div>;
      } else {
        pagingJSX = <div className="page-switch">That's all the videos we found!</div>;
      }
      contentJSX = <div className="main-container"><VideoList files={this.state.files} /><div className="pagination">{pagingJSX}</div></div>;
    } else {
      contentJSX = <div className="main-container"><h3>No videos found 🧐</h3></div>;
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
          <a href="/"><img alt="Vumble-Logo" src={logo} /></a>
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
        {contentJSX}
        <div className="waypoint">
          {/* <Waypoint onEnter={this.nextPage()} /> */}
        </div>
      </AppStyled>
    );
  }


}

export default App;
