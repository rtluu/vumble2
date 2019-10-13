import React, { Component } from "react";
import styled from "styled-components";
import ReactPlayer from 'react-player'
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

    .video-block{
        max-width: 50rem;
        position: relative;
        width: 100%;

        .video-holder{
            text-align: left;
            position: relative;

            &.expanded{
                position: fixed;
                background: rgba(0,0,0,0.9);
                z-index: 100;
                bottom: 0;
                left: 0;
                right: 0;
                top: 0;
                width: 100%;

                .thumbnail-container{
                    display: none;
                }

                .player-container{
                    position: relative;
                    max-width: 72rem;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: calc(100% - 4rem);
                    z-index: 3;

                    .player-holder{
                        div{
                            transform: translateY(0);
                            height: 100% !important;
                            width: 100% !important;
                        }
                    }
                }
            }

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

            .iframe-blocker{
                cursor: pointer;
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                top: 0;
                z-index: 2;

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

                    &.show{
                        opacity: 1;
                    }

                    &.hide{
                        display: none;
                    }
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
 
                    .player-inner{
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        top: 0;
                    }
 
                    div{
                        transform: translateY(-30.01%);
                        height: 250% !important;
                        width: 100% !important;
                    }
                }
            }
        }
    }
`

export default class Player extends Component {
    constructor(props) {
        super(props);


        this.state = {
            isPlaying: false,
            isExpanded: false,
            muted: true,
            volume: 0,
            isReady: false,
        };

        this.vidReady = this.vidReady.bind(this);
        this.vidPlay = this.vidPlay.bind(this);
        this.vidStop = this.vidStop.bind(this);
        this.expandVideo = this.expandVideo.bind(this);
        this.closeVideo = this.closeVideo.bind(this);
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
        this.setState({ volume: 100 });
        this.setState({ muted: false })
        this.setState({ isPlaying: true });
    }

    closeVideo() {
        this.setState({ isExpanded: false });
        this.setState({ volume: 0 });
        this.setState({ muted: true })
        this.setState({ isReady: false });
    }


    render() {
        var player = {};
        var button = {};
        if (this.state.isReady) {
            button.show = 'expand-button show';
        } else {
            button.show = 'expand-button';
        }
        if (this.state.isExpanded) {
            player.expand = 'video-holder expanded';
            player.mouseEnter = undefined;
            player.mouseLeave = undefined;
            player.blocker = this.closeVideo;
            button.show = 'expand-button hide';
        } else {
            player.expand = 'video-holder';
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
                <div className="video-block">
                    <div className={player.expand}>
                        <div className="thumbnail-container">
                            <img className="thumbnail" src={'https://img.youtube.com/vi/' + this.props.file + '/0.jpg'} />
                        </div>
                        <div className="iframe-blocker" onMouseEnter={player.mouseEnter} onMouseLeave={player.mouseLeave} onClick={player.blocker}>
                            <button className={button.show}>Click to expand w/sound</button>
                        </div>
                        <div className="player-container">
                            <div className="player-holder">
                                <div className="player-inner">
                                    {this.state.isPlaying &&
                                        <ReactPlayer
                                            url={'https://www.youtube.com/watch?v=' + this.props.file}
                                            volume={this.state.volume}
                                            playing={this.state.isPlaying}
                                            controls={true}
                                            muted={this.state.muted}

                                            onReady={this.vidReady}
                                            onStart={console.log('start')}
                                        />
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {!this.props.viewList && <Waypoint onLeave={this.vidStop} topOffset={'30%'} />}
            </VideoStyled >
        )
    }
}