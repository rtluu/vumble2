import _ from 'lodash';
import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';
import styled from "styled-components";
import { Waypoint } from 'react-waypoint';

const AppStyled = styled.div`
  
  // Header Styling
  header{
    background: #2A2B2A;
    
    position: fixed;
    width: 100%;
    z-index: 5;

    .header-options{
      display: flex;
      box-sizing: border-box;
      flex-direction: row;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      width: 100%;

      img{
        display: block;
        max-width: 7rem;
  
        @media (max-width: 50rem) {
            max-width: 6rem;
        }
  
      }
  
      .subreddit-container{
        display: flex;
        left: 50%;
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        max-width: 20rem;
        width: 50%;

        &.search{
          .subreddit-holder{
            .dropdown{
              .search-bar{
                display: block;
                border-radius: 0 0.25rem 0.25rem 0;
                position: relative;
                pointer-events: all;
                top: auto;
                opacity: 1;
                z-index: 2;
              }
              .dropdown-toggle{
                display: none;
              }
            }
          }
          .search-toggle{
            background: white;
            border: 0.0675rem solid white;

              .search-icon{
                filter: brightness(0%);
              }
          }
        }
        
        .subreddit-holder{
          align-items: center;
          background: #F2F2F2;
          border-radius: 0.25rem;
          display: flex;
          flex-direction: row;
          position: relative;
          width: 100%;

          .r-slash{
            background: #C4C4C4;
            border-radius: 0.25rem 0 0 0.25rem;
            color: black;
            height: 100%;
            padding: 0 0.5rem;
          }

          .dropdown{
            height: 100%;
            position: relative;
            flex-grow: 1;

            .search-bar{
              height: 100%;
              position: absolute;
              pointer-events: none;
              top: -1000%;
              opacity: 0;
              flex-grow: 1;
  
              input{
                box-sizing: border-box;
                border-radius: 0 0.25rem 0.25rem 0;
                border: none;
                height: 100%;
                outline: none;
                position: relative;
                width: 100%;
                padding: 0 0.375rem !important;
              }

              .search-icon{
                height: 1rem;
                position: absolute;
                right: 0.375rem;
                top: 50%;
                width: 1rem;
                transform: translateY(-50%);
              }
            }
    
            .dropdown-toggle{
              align-items: center;
              border: none;
              border-radius: 0 0.25rem 0.25rem 0;
              display: flex;
              height: 100%;
              justify-content: space-between;
              padding: 0 0.375rem;
              position: relative;
              text-align: left;
              transition: all 0.1s;
              width: 100%;    
              z-index: 2;
    
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
                border-radius: 0 0.25rem 0 0;
    
                .down-arrow{
                  border-color: black;
                }
              }
    
              .down-arrow{
                display: inline-block;
                height: 0.375rem;
                width: 0.75rem;
                transition: all 0.1s;
              }
            }

            .dropdown-menu{
              background: white;
              border-radius: 0 0 0.25rem 0.25rem;
              box-shadow: 0 0.125rem 0.25rem 0 rgba(0,0,0,0.5);
              display: none;
              flex-direction: column;
              min-width: 10rem;
              position: absolute;
              width: 100%;
              z-index: 1;
    
              &.open{
                display: flex;
              }
    
              .dropdown-item{
                color: black;
                padding: 0.5rem;
                font-size: 1rem;
    
                @media (hover: hover) {
                  &:hover{
                    background: #2A2B2A;
                    color: white;
                  }
                }
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
const downArrow = require("./images/down-arrow.svg");
const search = require("./images/search.svg");

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

    this.subDropdownOpen = this.subDropdownOpen.bind(this);
    this.subDropdownClose = this.subDropdownClose.bind(this);
    this.dropdownSort = this.dropdownSort.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.searchActive = this.searchActive.bind(this);
    this.closeSearch = this.closeSearch.bind(this);
    this.textInput = null;
  }

  state = {
    currentSubreddit: 'all',
    files: [],
    page: 1,
    after: null,
    before: null,
    sort: 'hot',

    subDropdown: false,
    searchActive: false,
    term: '',
  };


  componentDidMount() {
    this.changeSubreddit(this.state.currentSubreddit);
  }

  changeSubreddit(sub) {
    this.setState({
      files: [],
      currentSubreddit: sub,
      page: 1,
      subDropdown: false
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
          } else if (array[index].data.domain === "v.redd.it") {
            files.push(array[index])
          } else if (array[index].data.domain === "gfycat.com") {
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
    this.subDropdownClose();
  }

  changeSort(sort) {
    this.setState({
      files: [],
      sort: sort,
      page: 1,
      subDropdown: false
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

  subDropdownOpen() {
    this.setState({ subDropdown: true });
  }

  subDropdownClose() {
    this.setState({ subDropdown: false });
    this.setState({ searchActive: false });
  }


  searchActive() {
    this.setState({ searchActive: !this.state.searchActive });
    this.textInput.focus();
    document.addEventListener('mousedown', this.handleClick, false);
  }

  closeSearch() {
    this.setState({ searchActive: false });
    this.setState({ subDropdown: false });
    document.removeEventListener('mousedown', this.handleClick, false);
  }

  handleClick = (e) => {
    if (this.node.contains(e.target)) {
      return;
    }
    this.closeSearch();
  }

  dropdownSort() {
    this.setState({ dropdownSort: !this.state.dropdownSort });
  }

  search(term) {
    this.setState({ term });
    this.searchSubreddit(term);
  }

  render() {
    const searchSubreddit = _.debounce((term) => { this.searchSubreddit(term) }, 600);
    let currentSubreddit;
    if (this.state.currentSubreddit === this.videosSubreddit) {
      currentSubreddit = "videos";
    } else if (this.state.currentSubreddit === this.documentarySubreddit) {
      currentSubreddit = "documentaries";
    } else if (this.state.currentSubreddit === this.artisanSubreddit) {
      currentSubreddit = "artisanvideos";
    } else if (this.state.currentSubreddit === this.haikuSubreddit) {
      currentSubreddit = "youtubehaiku";
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
    if (this.state.subDropdown) {
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

    var subreddit = {}
    if (this.state.searchActive) {
      subreddit.container = "subreddit-container search"
    } else {
      subreddit.container = "subreddit-container"
    }

    return (
      <AppStyled>
        <header className="App-header">
          <div className="header-options">
            <a href="/"><img alt="Vumble-Logo" src={logo} /></a>
            <div className={subreddit.container}>
              <div className="subreddit-holder">
                <span className="r-slash"><h2>r/</h2></span>
                <div className="dropdown" ref={node => this.node = node} >
                  <button className={dropdown.toggleSub} onClick={() => { this.subDropdownOpen(); this.searchActive() }} type="button"><h2>{currentSubreddit}</h2><img className="down-arrow" src={downArrow} /></button>
                  <div className="search-bar">
                    <input type="text" className="form-control"
                      onChange={event => this.search(event.target.value)}
                      value={this.state.term}
                      name="search"
                      placeholder="Start typing..."
                      ref={elem => (this.textInput = elem)}
                      autocomplete="off" />
                    <img className="search-icon" src={search} />
                  </div>
                  <div className={dropdown.menuSub}>
                    <a className="dropdown-item" href="#subChange" onClick={() => { this.changeSubreddit(this.videosSubreddit); this.subDropdownClose() }}>r/videos</a>
                    <a className="dropdown-item" href="#subChange" onClick={() => { this.changeSubreddit(this.documentarySubreddit); this.subDropdownClose() }}>r/documentaries</a>
                    <a className="dropdown-item" href="#subChange" onClick={() => { this.changeSubreddit(this.artisanSubreddit); this.subDropdownClose() }}>r/artisanvideos</a>
                    <a className="dropdown-item" href="#subChange" onClick={() => { this.changeSubreddit(this.haikuSubreddit); this.subDropdownClose() }}>r/youtubehaiku</a>
                    {this.subredditsArray.map((subreddit, index) => (
                      <a className="dropdown-item" key={index} href="#subChange" onClick={() => { this.changeSubreddit(subreddit); this.subDropdownClose() }}>r/{subreddit}</a>
                    ))}
                  </div>
                </div>
              </div>
              {/* <div className="dropdown" >
                <button className={dropdown.toggleSort} onClick={this.dropdownSort} type="button" >{this.state.sort}</button>
                <div className={dropdown.menuSort} aria-labelledby="dropdownMenuButton">
                  {this.sorts.map((sort, index) => (
                    <a className="dropdown-item" key={index} href="#subChange" onClick={() => this.changeSort(sort)}>{sort}</a>
                  ))}
                </div>
              </div> */}
            </div>
            <div className="menu">
              <button>Menu</button>
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
