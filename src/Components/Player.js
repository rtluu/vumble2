import React, { Component } from "react";
import styled from "styled-components";
import ReactPlayer from 'react-player'
import { Waypoint } from 'react-waypoint';

const VideoStyled = styled.div`
    display: flex;
    align-items: stretch;
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

                &:hover{ 
                    background: rgba(0,0,0,0.8);
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
                    transform: translateY(-12.5%);
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
                    margin-bottom: 0.5rem;
                }
            }
        }
    }
`

export default class Player extends Component {
    constructor(props) {
        super(props);

        var post = this.props.file.data;
        var title = post.title;
        var upvotes = post.ups;
        var url = post.url;
        var id = '';



        if (url.includes('.be/')) {
            id = url.split('.be/')[1];
        } else if (url.includes('/embed/')) {
            id = url.split('/embed/')[1];
        } else {
            id = url.split('v=')[1];
        }
        // console.log('post', post);
        // console.log('id', id);
        if (id.includes('&')) {
            id = id.split('&')[0];
        } else if (id.includes('?t')) {
            id = id.split('?t')[0];
        }

        this.state = {
            //Post
            vidID: id,
            title: title,
            upvotes: upvotes,
            isExpanded: false,

            //Player
            isPlaying: false,
            muted: true,
            volume: 0,
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
        this.setState({ volume: 0 });
        this.setState({ muted: true })
        this.setState({ isReady: false });
    }

    expandVideo() {
        this.setState({ isExpanded: true });
        this.setState({ muted: false })
        this.setState({ volume: 70 });
        this.setState({ isPlaying: true });
    }

    closeVideo() {
        this.setState({ isExpanded: false });
        this.setState({ volume: 0 });
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
        var player = {};
        if (this.state.isReady | this.state.isPlaying) {
            player.button = 'expand-button show';
            player.time = 'time-box show';
        } else {
            player.button = 'expand-button';
            player.time = 'time-box';
        }
        if (this.state.isExpanded) {
            player.expand = 'post-block expanded';
            player.mouseEnter = undefined;
            player.mouseLeave = undefined;
            player.blocker = this.closeVideo;
            player.button = 'expand-button hide';
        } else {
            player.expand = 'post-block';
            player.mouseEnter = this.vidPlay;
            player.mouseLeave = this.vidStop;
            player.blocker = this.expandVideo;
        }
        if (!this.props.gridView) {
            player.mouseEnter = undefined;
            player.mouseLeave = undefined;
        }

        return (
            <VideoStyled>
                {!this.props.gridView && <Waypoint onEnter={this.vidPlay} bottomOffset={'30%'} />}
                <div className={player.expand}>
                    <div className="iframe-blocker" onMouseEnter={player.mouseEnter} onMouseLeave={player.mouseLeave} onClick={player.blocker}>
                        <button className={player.button}>Click to expand w/sound</button>
                    </div>
                    <div className="post-card">
                        <div className="thumbnail-container">
                            <img className="thumbnail" src={'https://img.youtube.com/vi/' + this.state.vidID + '/0.jpg'} />
                        </div>
                        <div className="player-container">
                            <div className="player-holder">
                                <div className="player-inner">
                                    {this.state.isPlaying &&
                                        <ReactPlayer
                                            url={'https://www.youtube.com/watch?v=' + this.state.vidID}
                                            volume={this.state.volume}
                                            playing={this.state.isPlaying}
                                            controls={true}
                                            muted={this.state.muted}
                                            onReady={this.vidReady}
                                            onDuration={this.handleDuration}
                                            onProgress={this.handleProgress}
                                        />
                                    }
                                </div>
                                <span className={player.time}>
                                    <p className="time-left">-<span className="spacer" />{this.state.minutesLeft}:{this.state.secondsLeft}</p>
                                </span>
                            </div>
                        </div>
                        <div className="post-info">
                            <h3 className="post-title">{this.state.title}</h3>
                            <h6 className="post-votes">{this.state.upvotes} upvotes</h6>
                        </div>
                    </div>
                </div>
                {!this.props.viewList && <Waypoint onLeave={this.vidStop} topOffset={'30%'} />}
            </VideoStyled >
        )
    }
}