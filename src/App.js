import React from 'react';
import './App.css';
import VideoList from './Components/VideoList';
import Footer from './Components/Footer'
import styled from "styled-components";
import { Waypoint } from 'react-waypoint';
import ReactGA from 'react-ga';

ReactGA.initialize('UA-152512551-1');
ReactGA.pageview('/home');


const AppStyled = styled.div`
  
  // Header Styling
  header{
    background: #2A2B2A;
    position: fixed;
    width: 100%;
    z-index: 12;

    .header-options{
      align-items: center;
      display: flex;
      box-sizing: border-box;
      flex-direction: row;
      justify-content: space-between;
      padding:  0.75rem 2% 0.75rem 2%;
      max-width: 72rem;
      width: 100%;

      @media (max-width: 60rem) {
        padding:  0.75rem 3.33% 0.75rem 3.33%;
      }

      @media (max-width: 40rem) {
        padding:  0.75rem 5% 0.75rem 5%;
      }

      .logo-holder{
        @media (max-width: 50rem) {
          overflow: hidden;
          max-width: 1.75rem;
        }

        img{
          display: block;
          max-width: 7rem;
    
          @media (max-width: 50rem) {
              max-width: 6rem;
          }
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
            .subreddit-dropdown{
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

          .subreddit-dropdown{
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

              .dropdown-menu{
                min-width: 10rem;
              }
            } 
          }
        }

        .dropdown-menu{
          background: white;
          border-radius: 0 0 0.25rem 0.25rem;
          box-shadow: 0 0.125rem 0.25rem 0 rgba(0,0,0,0.5);
          display: none;
          flex-direction: column;
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

      .menu{
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        flex-direction: row;
        padding: 0.75rem 0.25rem;

        @media (hover: hover) {
          &:hover{ 
              .circle{
                background: white;
              }
          }
        }

        .circle{
          align-items: center;
          background: #C4C4C4;
          border-radius: 50%;
          display: block;
          justify-content: center;
          height: 0.375rem;
          margin: 0.1rem;
          width: 0.375rem;
          transition: all 0.2s;
        }
      }
    }
  }

  .filter-bar{
    background: #2A2B2A;
    border-top: 0.0675rem solid #333333;
    display: inline-block;
    margin-top: 3.6rem;
    position: relative;
    width: 100%;
    z-index: 10;

    @media (max-width: 50rem) {
      margin-top: 3.5625rem;
    }

    .filter-container{
      display: flex;
      flex-direction: row;
      justify-content: center;
      padding: 0.25rem 0;
      position: relative;

      .filter{
        align-items: center;
        display flex;
        flex-direction: row;
        margin: 0 0.75rem;
        position: relative;
        
        h6{
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          opacity: 0.2;
        }

        .layout-switch{
          display: flex;
          flex-direction: row;
          margin-left: 0.675rem;

          &.grid{
            .grid{
              opacity: 0.7;
            }
          }

          &.list{
            .list{
              opacity: 0.7;
            }
          }

          button{
            align-items: center;
            border: 0;
            display: flex;
            justify-content: center;
            margin: 0 0.1875rem;
            opacity: 0.25;
            padding: 0.125rem 0.375rem;

            &.grid{
              padding: 0.125rem 0.25rem;
            }

            @media (hover: hover) {
              &:hover{ 
                opacity: 0.7;
              }
            }
          }
        }

        .sort-dropdown{
          margin-left: 0.25rem;
          
          .dropdown-toggle{
            border: 0;
            opacity: 0.25;
            padding: 0.125rem 0.5rem;
            transition: all 0.1s;

            &.active{
              opacity: 0.7;
            }

            @media (hover: hover) {
              &:hover{ 
                opacity: 0.7;
              }
            }            

            div{
              align-items: center;
              display: flex;
              img{
                width: 0.75rem;
              }

              p{
                color: white;
                font-size: 1.125rem;
                font-weight: 600;
                margin-left: 0.375rem;
                text-transform: capitalize;
              }
            }
          }
          .dropdown-menu{
            background: white;
            border-radius: 0.25rem;
            box-shadow: 0 0.125rem 0.25rem 0 rgba(0,0,0,0.5);
            display: none;
            flex-direction: column;
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
              text-transform: capitalize;
      
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

      .filter-divider{
        background: white;
        height: 1.5rem;
        margin: 0 0.5rem 0 0.25rem;
        opacity: 0.1;
        position: relative;
        width: 0.0675rem;
      }
    }
  }

  // Main Container
  .main-container{
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    min-height: calc(100vh - 10.25rem);

    @media (max-width: 60rem) {
      min-height: calc(100vh - 10rem);
    }

    @media (max-width: 40rem) {
      min-height: calc(100vh - 9.75rem);
    }

    .loading-box{
      position: absolute;
      top: 50%;
      transform: translateY(-50%);

      h2{
        position: relative;
      }
    }

    .pagination{
      display: block;
      margin: 2rem 0;
      text-align: center;

      .page-switch{
        display: inline-block;
        padding: 1rem;
        position: relative;
      }

      .loading-spinner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 3rem;
        width: 3rem;
        position: relative;

        .circle {
          display: block;
          border-radius: 50%;
          border: 0.25rem solid #fff;
          position: absolute;

          &.large {
            animation: spin-right 1s linear infinite;
            border-color: #C4C4C4 #C4C4C4 #C4C4C4 transparent;
            height: 2.5rem;
            width: 2.5rem;
          }

          &.small {
            animation: spin-left 1s linear infinite;
            border-color: #C4C4C4 #C4C4C4 #C4C4C4 transparent;
            height: 1.25rem;
            width: 1.25rem;
          }
        }
      }

      @keyframes spin-right {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes spin-left {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
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
    this.sorts = ['hot', 'new', 'top', 'rising'];

    this.subDropdownOpen = this.subDropdownOpen.bind(this);
    this.subDropdownClose = this.subDropdownClose.bind(this);
    this.sortDropdownOpen = this.sortDropdownOpen.bind(this);
    this.sortDropdownClose = this.sortDropdownClose.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.searchActive = this.searchActive.bind(this);
    this.closeSearch = this.closeSearch.bind(this);
    this.textInput = null;
    this.setList = this.setList.bind(this);
    this.setGrid = this.setGrid.bind(this);
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
    gridView: true,
    dropdownSort: false,
    width: window.innerWidth,
    loading: false,
    hasMore: true,
  };


  componentDidMount() {
    const sub = (this.props.match && this.props.match.params.subreddit) || 'all';
    this.changeSubreddit(sub, false);
    if (this.state.width <= 640) {
      this.setState({ gridView: false });
    }
  }

  componentDidUpdate(prevProps) {
    // Handle browser back/forward navigation
    const prevSub = prevProps.match && prevProps.match.params.subreddit;
    const nextSub = this.props.match && this.props.match.params.subreddit;
    if (prevSub !== nextSub) {
      this.changeSubreddit(nextSub || 'all', false);
      return;
    }
    if (this.state.files.length > 0 && this.state.files.length < 7 && !this.state.loading && this.state.hasMore) {
      this.nextPage();
    }
  }

  changeSubreddit(sub, pushHistory = true) {
    if (pushHistory && this.props.history) {
      this.props.history.push('/r/' + sub);
    }
    this.setState({
      files: [],
      currentSubreddit: sub,
      page: 1,
      subDropdown: false,
      loading: false,
      hasMore: true,
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
          } else if (array[index].data.domain === "streamable.com") {
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
      subDropdown: false,
      loading: false,
      hasMore: true,
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
    this.sortDropdownClose();
  }

  nextPage = () => {
    if (this.state.loading || !this.state.hasMore || !this.state.after) return;
    this.setState({ loading: true });
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
          page: this.state.page + 1,
          loading: false,
          hasMore: !!data.data.after,
        }));
      })
      .catch(() => this.setState({ loading: false }))
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

  handleClick2 = (e) => {
    if (this.node2.contains(e.target)) {
      return;
    }
    this.sortDropdownClose();
  }

  sortDropdownOpen() {
    this.setState({ dropdownSort: true });
    document.addEventListener('mousedown', this.handleClick2, false);
  }

  sortDropdownClose() {
    this.setState({ dropdownSort: false });
    document.removeEventListener('mousedown', this.handleClick2, false);
  }

  setList() {
    this.setState({ gridView: false });
  }

  setGrid() {
    this.setState({ gridView: true });
  }

  search(term) {
    this.setState({ term });
    this.searchSubreddit(term);
  }

  render() {
    const logo = require("./images/vumble-logo.svg");
    const downArrow = require("./images/down-arrow.svg");
    const search = require("./images/search.svg");
    const list = require("./images/list.svg");
    const grid = require("./images/grid.svg");

    var icon = require("./images/hot.svg");

    if (this.state.sort === 'hot') {
      icon = require("./images/hot.svg");
    } else if (this.state.sort === 'new') {
      icon = require("./images/new.svg");
    } else if (this.state.sort === 'top') {
      icon = require("./images/top.svg");
    } else if (this.state.sort === 'rising') {
      icon = require("./images/rising.svg");
    }

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
      if (this.state.hasMore) {
        pagingJSX = (
          <div>
            <Waypoint onEnter={this.nextPage} bottomOffset="-200px" />
            {this.state.loading && (
              <div className="loading-spinner">
                <span className="circle large" />
                <span className="circle small" />
              </div>
            )}
          </div>
        );
      } else {
        pagingJSX = <div className="page-switch">That's all the videos we found!</div>;
      }
      contentJSX = <div className="main-container">
        <VideoList files={this.state.files} gridView={this.state.gridView} />
        <div className="pagination">{pagingJSX}</div>
      </div>;
    } else {
      contentJSX = <div className="main-container"><VideoList files={this.state.files} gridView={this.state.gridView} /></div>;
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

    var subreddit = {};
    if (this.state.searchActive) {
      subreddit.container = "subreddit-container search"
    } else {
      subreddit.container = "subreddit-container"
    }

    var view = {};
    if (this.state.gridView) {
      view.switch = "layout-switch grid"
    } else {
      view.switch = "layout-switch list"
    }

    return (
      <AppStyled>
        <header className="App-header">
          <div className="header-options">
            <div className="logo-holder"><a href="/"><img alt="Vumble-Logo" src={logo} /></a></div>
            <div className={subreddit.container}>
              <div className="subreddit-holder">
                <span className="r-slash"><h2>r/</h2></span>
                <div className="subreddit-dropdown" ref={node => this.node = node} >
                  <button className={dropdown.toggleSub} onClick={() => { this.subDropdownOpen(); this.searchActive() }} type="button"><h2>{currentSubreddit}</h2><img className="down-arrow" src={downArrow} alt="" /></button>
                  <div className="search-bar">
                    <input type="text" className="form-control"
                      onChange={event => this.search(event.target.value)}
                      value={this.state.term}
                      name="search"
                      placeholder="Start typing..."
                      ref={elem => (this.textInput = elem)}
                      autocomplete="off" />
                    <img className="search-icon" src={search} alt="" />
                  </div>
                  <div className={dropdown.menuSub}>
                    <button className="dropdown-item" onClick={() => { this.changeSubreddit(this.videosSubreddit); this.subDropdownClose() }}>r/videos</button>
                    <button className="dropdown-item" onClick={() => { this.changeSubreddit(this.documentarySubreddit); this.subDropdownClose() }}>r/documentaries</button>
                    <button className="dropdown-item" onClick={() => { this.changeSubreddit(this.artisanSubreddit); this.subDropdownClose() }}>r/artisanvideos</button>
                    <button className="dropdown-item" onClick={() => { this.changeSubreddit(this.haikuSubreddit); this.subDropdownClose() }}>r/youtubehaiku</button>
                    {this.subredditsArray.map((subreddit, index) => (
                      <button className="dropdown-item" key={index} onClick={() => { this.changeSubreddit(subreddit); this.subDropdownClose() }}>r/{subreddit}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="menu">
              <span className="circle" />
              <span className="circle" />
              <span className="circle" />
            </div>
          </div>
        </header>
        <div className="filter-bar">
          <div className="filter-container">
            <div className="filter">
              <h6>VIEW</h6>
              <div className={view.switch}>
                <button className="grid" onClick={this.setGrid}><img src={grid} alt="Grid view" /></button>
                <button className="list" onClick={this.setList}><img src={list} alt="List view" /></button>
              </div>
            </div>
            <div className="filter-divider" />
            <div className="filter">
              <h6>SORT</h6>
              <div className="sort-dropdown" ref={node2 => this.node2 = node2} >
                <button className={dropdown.toggleSort} onClick={this.sortDropdownOpen} type="button" ><div><img src={icon} alt="" /><p>{this.state.sort}</p></div></button>
                <div className={dropdown.menuSort} aria-labelledby="dropdownMenuButton">
                  {this.sorts.map((sort, index) => (
                    <button className="dropdown-item" key={index} onClick={() => this.changeSort(sort)}>{sort}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {contentJSX}


        <Footer />
      </AppStyled>
    );
  }


}

export default App;
