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

        &:hover{
            .iframeblocker{
                iframe-icons{
                    &:before{
                        display:inline-block;
                    }
                    &:after{
                        display:inline-block;
                    }
                }
            }
        }

        &.youtube{
            .post-card{
                .thumbnail-container{
                    .thumbnail{
                        transform: translateY(-12.5%);
                    }
                }
            }
        }

        &.list{
            &.vertical{

                .iframe-blocker{
                    .iframe-icons{
                        padding-bottom: 100%;
                    }
                }

                .post-card{
                    @media (max-width: 40rem) {
                        .thumbnail-container{
                            padding-bottom: 100%;
                            .thumbnail{
                                transform: translateY(0) !important;
                            }
                        }
    
                        .player-container{
    
                            .player-holder{
                                padding-bottom: 100%;
                                top: 0 !important;
                                width: 100% !important;
                            }
                        }
                    }
    
                    .player-container{
                        .player-holder{
                            padding-bottom: 100%;
                            left: 50%;
                            transform: translateX(-50%);
                            top: -33.3%;
                            width: 58%;
                        }
                    }
                }
            }
            

            .vertical-background-blur{
                background: black;
                bottom: 0;
                content: '';
                backdrop-filter: blur(500px);
                left: 0;
                opacity: 1;
                position: absolute;
                right: 0;
                top: 0;
                pointer-events: none;
                transition: all 0.1s;
            }
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

            .iframe-blocker{
                .iframe-icons{
                    display: none;
                }
            }

            .post-card{
                box-shadow: none;
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
                    &.ended{
                        display: inline-block;
                        position: absolute;
                    } 
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
            z-index: 3;

            @media (hover: hover) {
                &:hover{
                    .iframe-icons{
                        &.show{
                            opacity: 1;
                        }
                    }
                    
                }
            }

            @media (hover: none) {
                .iframe-icons{
                    &.show{
                        opacity: 1;
                    }
                }
                
            }

            .iframe-icons{
                overflow: hidden;
                position: relative;
                padding-bottom: 56.25%;
                width: 100%;
                opacity: 0;
                transition: all 0.2s;

                &:before{
                    border-radius: 2rem 0 0 0;
                    box-shadow: 1rem -1rem 4rem 1.5rem rgba(0,0,0,0.4);
                    content: '';
                    display: inline-block;
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 0;
                    width: 0;
                    z-index: 2;
                }

                &:after{
                    border-radius: 2rem 0 0 0;
                    box-shadow: -1rem -1rem 4rem 1.5rem rgba(0,0,0,0.4);
                    content: '';
                    display: inline-block;
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    height: 0;
                    width: 0;
                    z-index: 2;
                }

                .expand-button{
                    background: rgba(0,0,0,0.2);
                    border: 0.0675rem solid white;
                    border-radius: 0.25rem;
                    color: white;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin: 0.5rem;
                    outline: none;
                    position: absolute;
                    padding: 0.25rem 0.5rem;
    
                    @media (hover: hover) {
                        &:hover{ 
                            background: rgba(0,0,0,0.8);
                        }
                    }
    
                    &.hide{
                        display: none;
                    }
                }

                .sound-icon{
                    bottom: 0;
                    display: flex;
                    flex-direction: row;
                    padding: 0.375rem 0.5rem;
                    position: absolute;
                    left: 0;
                    z-index: 2;

                    @media (hover: hover) {
                        &:hover{
                            .sound-text{
                                opacity: 1;
                            }    
                        }
                    }
        
                    @media (hover: none) {
                        .sound-text{
                            opacity: 1;
                        }  
                    }
                    
                    img{
                        display: block;
                    }

                    .sound-text{
                        color: white;
                        margin-left: 0.1875rem;
                        opacity: 0;
                        transition: all 0.2s;
                    }
                }

                .time-box{
                    bottom: 0;
                    position: absolute;
                    padding: 0.375rem 0.5rem;
                    right: 0;
                    pointer-events: none;
                    z-index: 3;
                    transition: all 0.2s;

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

        .post-card{
            background: #e2e2e2;
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
                z-index: 2;

                &.ended{
                    z-index: 2;

                    &:after{
                        background: rgba(0,0,0,0.6);
                        content: "";
                        display: block;
                        height: 100%;
                        position: absolute;
                        width: 100%;
                    }

                    .replay{
                        display: inline-block;
                    }
                    
                }

                .loading-spinner{
                    align-items: center;
                    display: flex;
                    justify-content: center;
                    height: 3rem;
                    left: 50%;
                    position: absolute;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 3rem;
                    z-index: 1;

                    .circle{
                        display: block;
                        border-radius: 50%;
                        border: 0.25rem solid #fff;
                        position: absolute;
                       
                        &.large{
                            animation: spin-right 1s linear infinite;
                            border-color: #fff #fff #fff transparent;
                            height: 2.5rem;
                            width: 2.5rem;
                        }

                        &.small{
                            animation: spin-left 1s linear infinite;
                            border-color: #fff #fff #fff transparent;
                            height: 1.25rem;
                            width: 1.25rem;
                        }
                    }
                }
                @keyframes spin-right {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                @keyframes spin-left {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(-360deg);
                    }
                }


                .replay{
                    border: none;
                    cursor: pointer;
                    display: none;
                    left: 50%;
                    position: absolute;
                    opacity: 0.8;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    transition: all 0.1s;
                    z-index: 3;

                    @media (hover: hover) {
                        &:hover{
                            opacity: 1;
                        }
                    }

                    @media (hover: none) {
                        opacity: 1;
                    }
                    
                }
 
                .thumbnail{
                    bottom: 0;
                    left: 0;
                    position: absolute;
                    right: 0;
                    top: 0;                    
                    width: 100%;

                    &.hide{
                        opacity: 0;
                    }
                }
            }

            .player-container{
                background: black;
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
                }
            }
            .post-info{
                padding: 0.5rem 0.75rem;
                position: relative;
                background: white;
                z-index: 1;

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

        //Calculating Time Posted
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

        // Calculating Upvotes
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

        // Calculating Comments
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

        // Identifying Video Type
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
            if (post.crosspost_parent) {
                vidHeight = post.crosspost_parent_list[0].media.reddit_video.height;
                vidWidth = post.crosspost_parent_list[0].media.reddit_video.width;
                playerReadyUrl = post.crosspost_parent_list[0].media.reddit_video.fallback_url;

                if (post.crosspost_parent_list[0].preview) {
                    thumbnail = post.crosspost_parent_list[0].preview.images[0].source.url;
                    thumbnail = thumbnail.split('&amp;').join('&');
                    vidRatio = vidHeight / vidWidth;
                } else if (post.thumbnail) {
                    thumbnail = post.thumbnail;
                    thumbnail = thumbnail.split('&amp;').join('&');
                    vidRatio = vidHeight / vidWidth;
                } else {
                    thumbnail = require("./images/confused-bee.png");
                    vidRatio = null;
                }

            } else {
                vidHeight = post.media.reddit_video.height;
                vidWidth = post.media.reddit_video.width;
                playerReadyUrl = post.media.reddit_video.fallback_url;
                if (post.preview) {
                    thumbnail = post.preview.images[0].source.url;
                    thumbnail = thumbnail.split('&amp;').join('&');
                    vidRatio = vidHeight / vidWidth;
                } else if (post.thumbnail) {
                    thumbnail = post.thumbnail;
                    thumbnail = thumbnail.split('&amp;').join('&');
                    vidRatio = vidHeight / vidWidth;
                } else {
                    thumbnail = require("./images/confused-bee.png");
                    vidRatio = null;
                }

            }

            if (vidRatio > 1) {
                ratioTransform = 37.5;
                vidVert = true;
            } else if (vidRatio <= 1 & vidRatio > 0.57) {
                vidVert = true;
                ratioTransform = ((vidRatio - 0.5625) / 2) * 100;
            }
            playerReadyThumbnail = thumbnail;
        } else if (post.domain === "gfycat.com") {
            isGfycat = true;
            //Determine if Gfycat video is a Crosspost or Original
            if (post.crosspost_parent) {
                url = post.crosspost_parent_list[0].media.oembed.thumbnail_url;
                vidHeight = post.crosspost_parent_list[0].media.oembed.height;
                vidWidth = post.crosspost_parent_list[0].media.oembed.width;
                vidRatio = vidHeight / vidWidth;
                url = url.split('.com/')[1];
                id = url.split('-size')[0];
                playerReadyUrl = 'https://thumbs.gfycat.com/' + id + '-mobile.mp4';
                playerReadyThumbnail = 'https://thumbs.gfycat.com/' + id + '-mobile.jpg';
            }
            else if (post.media) {
                url = post.media.oembed.thumbnail_url;
                vidHeight = post.media.oembed.height;
                vidWidth = post.media.oembed.width;
                vidRatio = vidHeight / vidWidth;
                url = url.split('.com/')[1];
                id = url.split('-size')[0];
                playerReadyUrl = 'https://thumbs.gfycat.com/' + id + '-mobile.mp4';
                playerReadyThumbnail = 'https://thumbs.gfycat.com/' + id + '-mobile.jpg';
            } else {
                id = post.url.split('.com/')[1];
                playerReadyUrl = post.preview.reddit_video_preview.fallback_url;
                playerReadyThumbnail = require("./images/confused-bee.png");

            }
            // Detecting Video Ratio
            if (vidRatio > 1) {
                ratioTransform = 37.5;
                vidVert = true;
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
                thumbnail = require("./images/confused-bee.png");
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
            hasStarted: false,
            hasEnded: false,
            duration: 0,
            played: 0,
            loaded: 0,

            //Duration
            minutesLeft: '0',
            secondsLeft: '00',
        };

        this.vidStart = this.vidStart.bind(this);
        this.vidEnd = this.vidEnd.bind(this);
        this.vidPlay = this.vidPlay.bind(this);
        this.vidReplay = this.vidReplay.bind(this);
        this.vidStop = this.vidStop.bind(this);
        this.expandVideo = this.expandVideo.bind(this);
        this.closeVideo = this.closeVideo.bind(this);
        this.handleDuration = this.handleDuration.bind(this);
    }

    vidStart() {
        this.setState({ hasStarted: true });
        this.setState({ hasEnded: false });
    }

    vidEnd() {
        if (!this.state.isExpanded) {
            this.setState({ isPlaying: false });
        }
        this.setState({ hasEnded: true });
    }

    vidPlay() {
        this.setState({ isPlaying: true });
        this.setState({ hasEnded: false });
    }

    vidReplay() {
        this.setState({ hasEnded: false });
        this.setState({ hasStarted: true });
        this.player.seekTo(0);
        this.setState({ isPlaying: true });
    }

    vidStop() {
        this.setState({ isPlaying: false });
        this.setState({ hasStarted: false });
        this.setState({ muted: true })
    }

    expandVideo() {
        this.setState({ isExpanded: true });
        this.setState({ muted: false })
        this.setState({ isPlaying: true });
    }

    closeVideo() {
        this.setState({ isExpanded: false });
        this.setState({ muted: true })
        this.setState({ hasEnded: false });
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

    ref = player => {
        this.player = player
    }

    render() {
        const replay = require("./images/replay.svg");
        var post = {};
        if (this.state.hasStarted && !this.state.hasEnded) {
            post.icons = 'iframe-icons show';
        } else {
            post.icons = 'iframe-icons';
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
        if (!this.props.gridView | this.props.isMobile) {
            post.mouseEnter = undefined;
            post.mouseLeave = undefined;
            post.view = 'list';
        }
        if (this.state.hasEnded) {
            post.thumbContain = "thumbnail-container ended"
        } else {
            post.thumbContain = "thumbnail-container"
        }


        //Determine which Source Icon Image to use
        var upvote = require("./images/upvote.svg");
        var comment = require("./images/comments.svg");
        if (this.state.isYT) {
            post.type = 'youtube';
            post.imgSrc = require("./images/youtube-logo.svg");
            post.soundSrc = require("./images/muted.svg");
            post.soundText = "Muted";
        } else if (this.state.isReddit) {
            post.type = 'reddit';
            post.imgSrc = require("./images/reddit-logo.svg");
            post.soundSrc = require("./images/no-sound.svg");
            post.soundText = "No sound";
        } else if (this.state.isGfycat) {
            post.type = 'gfycat';
            post.imgSrc = require("./images/gfycat-logo.svg");
            post.soundSrc = require("./images/no-sound.svg");
            post.soundText = "No sound";
        } else if (this.state.isStreamable) {
            post.type = 'streamable';
            post.imgSrc = require("./images/streamable-logo.svg");
            post.soundSrc = require("./images/muted.svg");
            post.soundText = "Muted";
        }

        // Change style for vertical videos - Reddit & Gfycat
        const ratioTransformThumbnail = {
            transform: `translateY(-${this.state.ratioTransform}%)`
        };
        if (this.state.isVert && !this.state.isExpanded) {
            post.thumbnail = "thumbnail vertical";
            post.vertical = "vertical"
        } else {
            post.thumbnail = "thumbnail";
            post.vertical = ""
        }

        if (this.state.hasStarted && !this.state.hasEnded) {
            post.thumbHide = "hide"
        } else {
            post.thumbHide = ""
        }


        return (
            <VideoStyled>
                {!this.props.gridView && !this.state.isExpanded | this.props.isMobile && !this.state.isExpanded && <Waypoint onEnter={this.vidPlay} bottomOffset={'30%'} />}
                <div className={'' + post.expand + ' ' + post.type + ' ' + post.view + ' ' + post.vertical}>
                    <div className="iframe-blocker" onMouseEnter={post.mouseEnter} onMouseLeave={post.mouseLeave} onClick={post.blocker}>
                        <div className={post.icons}>
                            <button className="expand-button">Click to expand</button>
                            <div className="sound-icon">
                                <img src={post.soundSrc} />
                                <p className="sound-text">{post.soundText}</p>
                            </div>
                            <span className="time-box">
                                <p className="time-left">-<span className="spacer" />{this.state.minutesLeft}:{this.state.secondsLeft}</p>
                            </span>
                        </div>
                    </div>
                    <div className="post-card">
                        <div className={post.thumbContain}>
                            {this.state.isPlaying && !this.state.hasStarted &&
                                <span className="loading-spinner">
                                    <span className="circle large" />
                                    <span className="circle small" />
                                </span>
                            }
                            <img className={post.thumbnail + ' ' + post.thumbHide} src={this.state.thumbnail} style={ratioTransformThumbnail} />
                            {this.state.hasEnded && <button onClick={this.vidReplay} className="replay"><img src={replay} /> </button>}
                        </div>
                        {this.state.isPlaying &&
                            <div className="vertical-background-blur" />
                        }
                        <div className="player-container">
                            <div className="player-holder">
                                <div className="player-inner">
                                    {this.state.isPlaying | (this.state.hasEnded && !this.state.isExpanded) &&
                                        <ReactPlayer
                                            ref={this.ref}
                                            url={this.state.url}
                                            volume={this.state.volume}
                                            playing={this.state.isPlaying}
                                            controls={true}
                                            muted={this.state.muted}
                                            onStart={this.vidStart}
                                            onEnded={this.vidEnd}
                                            onDuration={this.handleDuration}
                                            onProgress={this.handleProgress}
                                            playsinline={true}
                                        />
                                    }
                                </div>
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
                                    <img src={post.imgSrc} />
                                </div>
                            </div>
                        </div>
                        {/* Comments */}
                        {/* {this.state.isExpanded &&
                            <Comments permalink={this.state.permalink} />
                        } */}
                    </div>
                </div>
                {!this.props.gridView && !this.state.isExpanded | this.props.isMobile && !this.state.isExpanded && <Waypoint onLeave={this.vidStop} topOffset={'30%'} />}
            </VideoStyled >
        )
    }
}