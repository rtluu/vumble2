import React, { Component } from "react";
import styled from "styled-components";
import ReactPlayer from 'react-player'
// import Comments from './Comments';
import { Waypoint } from 'react-waypoint';

const VideoStyled = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    margin: 1.5rem 0;

    .waypoint{
        position: absolute;
        top: 50%;
    }

    .post-block{
        max-width: 50rem;
        position: relative;
        width: 100%;

        &.youtube{
            .post-card{
                .thumbnail-container{
                    .thumbnail{
                        transform: translateY(-12.5%);
                    }
                }
            }
        }

        &.reddit{
            
        }

        &.gfycat{
        
        }

        &.expanded{
            position: fixed;
            background: rgba(0,0,0,0.9);
            z-index: 100;
            bottom: 0;
            left: 0;
            right: 0;
            top: 0;
            max-width: none;
            width: 100%;

            .post-card{
                max-width: 72rem;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: calc(100% - 4rem);
                z-index: 3;

                @media (max-width: 40rem) {
                    width: 100%;
                }

                .thumbnail-container{
                    display: none;
                }
    
                .player-container{
                    position: relative;

                    .player-holder{
                        div{
                            transform: translateY(0);
                            height: 100% !important;
                            width: 100% !important;
                        }
                    }
                    
                    .time-box{
                        display: none;
                    }
                }
                .post-info{
                    padding: 0.75rem;
                    .post-title{
                        font-size: 1.25rem;
                    }  
                }
            } 
        }

        .iframe-blocker{
            cursor: pointer;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            top: 0;
            text-align: left;
            z-index: 2;

            @media (hover: hover) {
                &:hover{
                    .expand-button{
                        &.show{
                            opacity: 1;
                        }
                    }
                }
            }

            @media (hover: none) {
                .expand-button{
                    &.show{
                        opacity: 1;
                    }
                }
            }

            .expand-button{
                background: rgba(0,0,0,0.2);
                border: 0.0675rem solid white;
                border-radius: 0.25rem;
                color: white;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 700;
                margin: 0.75rem;
                opacity: 0;
                outline: none;
                position: relative;
                padding: 0.25rem 0.5rem;
                transition: all 0.2s;

                @media (hover: hover) {
                    &:hover{ 
                        background: rgba(0,0,0,0.8);
                    }
                }

                &.hide{
                    display: none;
                }
            }
        }

        .post-card{
            background: white;
            border-radius: 0.25rem;
            box-shadow: 0 0.0675rem 0.25rem 0 rgba(0,0,0,0.15);
            position: relative;
            overflow: hidden;
            text-align: left;

            .thumbnail-container{
                overflow: hidden;
                position: relative;
                padding-bottom: 56.25%;
                width: 100%;
 
                .thumbnail{
                    bottom: 0;
                    left: 0;
                    position: absolute;
                    right: 0;
                    top: 0;                    
                    width: 100%;
                }
            }

            .player-container{
                cursor: pointer;
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                top: 0;
                z-index: 1;
 
                .player-holder{
                    padding-bottom: 56.25%;
                    position: relative;
                    overflow: hidden;
                    top: 0;

                    &:after{
                        border-radius: 2rem 0 0 0;
                        box-shadow: -1rem -1rem 4rem 1.5rem rgba(0,0,0,0.4);
                        content: '';
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        height: 0;
                        width: 0;
                        z-index: 2;
                    }
                    
 
                    .player-inner{
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        top: 0;  
                    }
                    
                    div{
                        transform: translateY(-30.005%);
                        height: 250% !important;
                        width: 100% !important;

                        video{
                            background: black;
                        }
                    }

                    .time-box{
                        bottom: 0;
                        position: absolute;
                        padding: 0.25rem;
                        margin: 0.125rem;
                        right: 0;
                        opacity: 0;
                        z-index: 3;
                        transition: all 0.2s;

                        &.show{
                            opacity: 1;
                        }

                        .time-left{
                            color: white;

                            .spacer{
                                display: inline-block;
                                position: relative;
                                height: 0.2rem
                                width: 0.0675rem;
                            }
                        }
                    }
                }  
            }
            .post-info{
                padding: 0.5rem 0.75rem;

                .post-title{
                    font-size: 0.875rem;
                    margin: 0.25rem 0 0.5rem 0;
                }

                .post-data{
                    align-items: center;
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    width: 100%;

                    .data-left{
                        display: flex;
                        flex-direction: row;

                        div{
                            display: flex;
                            align-items: center;
                            flex-direction: row;
                            margin-right: 0.5rem;

                            &.post-vote{
                                img{
                                    margin-top: -0.0625rem;
                                }
                            }

                            &.post-comments{
                                img{
                                    height: 0.625rem;
                                    width: 1.125rem;
                                }
                            }

                            &.post-subreddit, &.post-time{
                                h6{
                                    margin-right: 0;
                                    margin-left: 0;
                                }
                            }

                            img{
                                display: inline-block;
                                position: relative;
                            }
                            h6{
                                color: #D3D3D3;
                                margin-left: 0.1875rem;
                            }
                        }
                    }
                    .post-type{
                        display: flex;
                        align-items: center;
                    }
                }
            }
        }
    }
`

export default class Player extends Component {
    constructor(props) {
        super(props);

        var post = this.props.file.data;
        var permalink = post.permalink;
        var title = post.title;
        var url = post.url;
        var subreddit = post.subreddit_name_prefixed;
        var thumbnail = '';
        var id = '';
        var playerReadyUrl = '';
        var playerReadyThumbnail = '';
        var isYT = false;
        var isReddit = false;
        var isGfycat = false;
        var isStreamable = false;
        var vidVert = false;
        var vidHeight;
        var vidWidth;
        var vidRatio;
        var ratioTransform;

        //Time Posted Calculation
        var createdTime = (post.created_utc);
        var currentTime = Math.floor(Date.now() / 1000);
        var timeSeconds = currentTime - createdTime;
        var timeMinutes = timeSeconds / 60;
        var timeHours = timeMinutes / 60;
        var timeDays = timeHours / 24;
        var timeYears = timeDays / 365;
        var time;
        if (timeYears >= 1) {
            time = Math.floor(timeYears) + 'y';
        } else if (timeYears < 1 & timeDays >= 1) {
            time = Math.floor(timeDays) + 'd';
        } else if (timeDays < 1 & timeHours >= 1) {
            time = Math.floor(timeHours) + 'h';
        } else if (timeHours < 1 & timeMinutes >= 1) {
            time = Math.floor(timeMinutes) + 'm';
        } else {
            time = '1m';
        }

        var ups;
        if (post.ups > 1000) {
            var upsnumber = Math.round(post.ups / 1000) * 1000;
            var digits = upsnumber.toString();
            var realNumber;
            if (digits.length === 6) {
                realNumber = digits.substring(0, 3);
            } else if (digits.length === 5) {
                realNumber = digits.substring(0, 2);
            } else if (digits.length === 4) {
                realNumber = digits.substring(0, 1);
            }
            ups = realNumber + 'K';
        } else {
            ups = post.ups;
        }
        var upvotes = ups;
        var comNum;
        if (post.num_comments > 1000) {
            var commentsnumber = Math.round(post.num_comments / 1000) * 1000;
            var digits = commentsnumber.toString();
            var realNumber;
            if (digits.length === 6) {
                realNumber = digits.substring(0, 3);
            } else if (digits.length === 5) {
                realNumber = digits.substring(0, 2);
            } else if (digits.length === 4) {
                realNumber = digits.substring(0, 1);
            }
            comNum = realNumber + 'K';
        } else {
            comNum = post.num_comments;
        }
        var comments = comNum;

        if (post.domain === "youtube.com" | post.domain === "youtu.be" | post.domain === "m.youtube.com" && !post.url.includes('/channel/') && !post.url.includes('/playlist') && !post.url.includes('it.')) {
            //Trim YouTube domain off of URL
            isYT = true;
            if (url.includes('.be/')) {
                id = url.split('.be/')[1];
            } else if (url.includes('/embed/')) {
                id = url.split('/embed/')[1];
            } else if (url.includes('v=')) {
                id = url.split('v=')[1];
            }
            //Pinpoint YouTube ID
            if (id.includes('&')) {
                id = id.split('&')[0];
            } else if (id.includes('?t')) {
                id = id.split('?t')[0];
            }
            playerReadyUrl = 'https://www.youtube.com/watch?v=' + id;
            playerReadyThumbnail = 'https://img.youtube.com/vi/' + id + '/0.jpg';
        } else if (post.domain === "v.redd.it") {
            isReddit = true;
            //Determine if Reddit video is a Crosspost or Original
            if (post.thumbnail) {
                if (post.crosspost_parent) {
                    if (post.crosspost_parent_list[0].preview) {
                        thumbnail = post.crosspost_parent_list[0].preview.images[0].source.url;
                    } else {
                        thumbnail = post.thumbnail;
                    }
                    vidHeight = post.crosspost_parent_list[0].media.reddit_video.height;
                    vidWidth = post.crosspost_parent_list[0].media.reddit_video.width;
                    playerReadyUrl = post.crosspost_parent_list[0].media.reddit_video.fallback_url;
                } else {
                    if (post.preview.images[0]) {
                        thumbnail = post.preview.images[0].source.url;
                    } else {
                        thumbnail = post.thumbnail;
                    }
                    vidHeight = post.media.reddit_video.height;
                    vidWidth = post.media.reddit_video.width;
                    playerReadyUrl = post.media.reddit_video.fallback_url;
                }
                //Un-encode Thumbnail URL
                thumbnail = thumbnail.split('&amp;').join('&');
            }

            vidRatio = vidHeight / vidWidth;
            if (vidRatio > 1) {
                ratioTransform = 37.5;
            } else if (vidRatio <= 1 & vidRatio > 0.57) {
                vidVert = true;
                ratioTransform = ((vidRatio - 0.5625) / 2) * 100;
            }

            playerReadyThumbnail = thumbnail;
        } else if (post.domain === "gfycat.com") {
            isGfycat = true;
            if (post.crosspost_parent) {
                url = post.crosspost_parent_list[0].media.oembed.thumbnail_url;
                vidHeight = post.crosspost_parent_list[0].media.oembed.height;
                vidWidth = post.crosspost_parent_list[0].media.oembed.width;
            }
            else {
                url = post.media.oembed.thumbnail_url;
                vidHeight = post.media.oembed.height;
                vidWidth = post.media.oembed.width;
            }
            url = url.split('.com/')[1];
            id = url.split('-size')[0];
            playerReadyUrl = 'https://thumbs.gfycat.com/' + id + '-mobile.mp4';
            playerReadyThumbnail = 'https://thumbs.gfycat.com/' + id + '-mobile.jpg';

            vidHeight = post.media.oembed.height;
            vidWidth = post.media.oembed.width;
            vidRatio = vidHeight / vidWidth;
            if (vidRatio > 1) {
                ratioTransform = 37.5;
            } else if (vidRatio <= 1 & vidRatio > 0.57) {
                vidVert = true;
                ratioTransform = ((vidRatio - 0.5625) / 2) * 100;
            }
        } else if (post.domain === "streamable.com") {
            isStreamable = true;
            if (post.crosspost_parent) {
                url = post.crosspost_parent_list[0].url;
            }
            else {
                url = post.url;
            }
            if (post.media != null) {
                thumbnail = post.media.oembed.thumbnail_url;
            } else {
                thumbnail = null;
            }

            playerReadyUrl = url;
            playerReadyThumbnail = thumbnail;
        }



        this.state = {
            //Post
            url: playerReadyUrl,
            thumbnail: playerReadyThumbnail,
            title: title,
            upvotes: upvotes,
            comments: comments,
            subreddit: subreddit,
            permalink: permalink,
            time: time,
            isExpanded: false,
            isYT: isYT,
            isReddit: isReddit,
            isGfycat: isGfycat,
            isStreamable: isStreamable,
            isVert: vidVert,
            ratioTransform: ratioTransform,

            //Player
            isPlaying: false,
            muted: true,
            isReady: false,
            duration: 0,
            played: 0,
            loaded: 0,

            //Duration
            minutesLeft: '0',
            secondsLeft: '00',
        };

        this.vidReady = this.vidReady.bind(this);
        this.vidPlay = this.vidPlay.bind(this);
        this.vidStop = this.vidStop.bind(this);
        this.expandVideo = this.expandVideo.bind(this);
        this.closeVideo = this.closeVideo.bind(this);
        this.handleDuration = this.handleDuration.bind(this);
    }

    vidReady() {
        this.setState({ isReady: true });
    }

    vidPlay() {
        this.setState({ isPlaying: true });
    }

    vidStop() {
        this.setState({ isPlaying: false });
        this.setState({ muted: true })
        this.setState({ isReady: false });
    }

    expandVideo() {
        this.setState({ isExpanded: true });
        this.setState({ muted: false })
        this.setState({ isPlaying: true });
    }

    closeVideo() {
        this.setState({ isExpanded: false });
        this.setState({ muted: true })
        this.setState({ isReady: false });
    }

    handleDuration = (duration) => {
        this.setState({ duration })
    }

    handleProgress = state => {
        var timePlayed = Math.round(state.playedSeconds);
        var timeLeft = this.state.duration - timePlayed;
        var minutesLeft = Math.floor(timeLeft / 60);
        var secondsLeft = Math.floor(timeLeft % 60);
        if (secondsLeft < 10) {
            secondsLeft = '0' + secondsLeft;
        }
        this.setState({ minutesLeft: minutesLeft });
        this.setState({ secondsLeft: secondsLeft });
    }


    render() {

        //For Reddit & Gfycat Thumbnail Centering
        const styles = {
            transform: `translateY(-${this.state.ratioTransform}%)`
        };

        var post = {};
        if (this.state.isReady | this.state.isPlaying) {
            post.button = 'expand-button show';
            post.time = 'time-box show';
        } else {
            post.button = 'expand-button';
            post.time = 'time-box';
        }
        if (this.state.isExpanded) {
            post.expand = 'post-block expanded';
            post.mouseEnter = undefined;
            post.mouseLeave = undefined;
            post.blocker = this.closeVideo;
            post.button = 'expand-button hide';
        } else {
            post.expand = 'post-block';
            post.mouseEnter = this.vidPlay;
            post.mouseLeave = this.vidStop;
            post.blocker = this.expandVideo;
        }
        if (!this.props.gridView) {
            post.mouseEnter = undefined;
            post.mouseLeave = undefined;
        }

        //Post Data Images
        var upvote = require("./images/upvote.svg");
        var comment = require("./images/comments.svg");
        var imgSrc;
        if (this.state.isYT) {
            post.type = 'youtube';
            imgSrc = require("./images/youtube-logo.svg");
        } else if (this.state.isReddit) {
            post.type = 'reddit';
            imgSrc = require("./images/reddit-logo.svg");
        } else if (this.state.isGfycat) {
            post.type = 'gfycat';
            imgSrc = require("./images/gfycat-logo.svg");
        } else if (this.state.isStreamable) {
            post.type = 'streamable';
            imgSrc = require("./images/streamable-logo.svg");
        }

        if (this.state.isVert) {
            post.thumbnail = "thumbnail vertical";
        } else {
            post.thumbnail = "thumbnail";
        }



        return (
            <VideoStyled>
                {!this.props.gridView && !this.state.isExpanded && <Waypoint onEnter={this.vidPlay} bottomOffset={'30%'} />}
                <div className={'' + post.expand + ' ' + post.type}>
                    <div className="iframe-blocker" onMouseEnter={post.mouseEnter} onMouseLeave={post.mouseLeave} onClick={post.blocker}>
                        <button className={post.button}>Click to expand</button>
                    </div>
                    <div className='post-card'>
                        <div className="thumbnail-container">
                            <img className={post.thumbnail} src={this.state.thumbnail} style={styles} />
                        </div>
                        <div className="player-container">
                            <div className="player-holder">
                                <div className="player-inner">
                                    {this.state.isPlaying &&
                                        <ReactPlayer
                                            url={this.state.url}
                                            volume={this.state.volume}
                                            playing={this.state.isPlaying}
                                            controls={true}
                                            muted={this.state.muted}
                                            onReady={this.vidReady}
                                            onDuration={this.handleDuration}
                                            onProgress={this.handleProgress}
                                            playsinline={true}
                                        />
                                    }
                                </div>
                                <span className={post.time}>
                                    <p className="time-left">-<span className="spacer" />{this.state.minutesLeft}:{this.state.secondsLeft}</p>
                                </span>
                            </div>
                        </div>
                        <div className="post-info">
                            <h4 className="post-title">{this.state.title}</h4>

                            <div className="post-data">

                                <div className="data-left">
                                    <div className="post-vote">
                                        <img src={upvote} />
                                        <h6 className="vote-count">{this.state.upvotes}</h6>
                                    </div>

                                    <div className="post-comments">
                                        <img src={comment} />
                                        <h6 className="comments-count">{this.state.comments}</h6>
                                    </div>

                                    <div className="post-subreddit">
                                        <h6 className="subreddit">{this.state.subreddit}</h6>
                                    </div>

                                    <div className="post-time">
                                        <h6 className="time">{this.state.time}</h6>
                                    </div>
                                </div>

                                <div className={"post-type " + post.type}>
                                    <img src={imgSrc} />
                                </div>
                            </div>
                        </div>
                        {/* Comments */}
                        {/* {this.state.isExpanded &&
                            <Comments permalink={this.state.permalink} />
                        } */}
                    </div>
                </div>
                {!this.props.gridView && !this.state.isExpanded && <Waypoint onLeave={this.vidStop} topOffset={'30%'} />}
            </VideoStyled >
        )
    }
}