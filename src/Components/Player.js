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
            volume: 0
        };

        this.vidPlay = this.vidPlay.bind(this);
        this.vidStop = this.vidStop.bind(this);
        this.expandVideo = this.expandVideo.bind(this);
        this.closeVideo = this.closeVideo.bind(this);
    }

    vidPlay() {
        this.setState({ isPlaying: true });
    }

    vidStop() {
        this.setState({ isPlaying: false });
        this.setState({ volume: 0 });
    }


    expandVideo() {
        this.setState({ isExpanded: true });
        this.setState({ volume: 100 });
        this.setState({ isPlaying: true });
    }

    closeVideo() {
        this.setState({ isExpanded: false });
        this.setState({ volume: 0 });
        this.setState({ isPlaying: false });
    }


    render() {
        var player = {};
        if (this.state.isExpanded) {
            player.expand = 'video-holder expanded';
            player.mouseEnter = undefined;
            player.mouseLeave = undefined;
            player.blocker = this.closeVideo;
        } else {
            player.expand = 'video-holder';
            player.mouseEnter = this.vidPlay;
            player.mouseLeave = this.vidStop;
            player.blocker = this.expandVideo;

        }
        return (
            <VideoStyled>
                {!this.props.gridView && <Waypoint onEnter={this.vidPlay} bottomOffset={'30%'} />}
                <div className="video-block">
                    <div className={player.expand}>
                        <div className="thumbnail-container">
                            <img className="thumbnail" src={'https://img.youtube.com/vi/' + this.props.file + '/0.jpg'} />
                        </div>
                        <div className="iframe-blocker" onMouseEnter={player.mouseEnter} onMouseLeave={player.mouseLeave} onClick={player.blocker} />
                        <div className="player-container">
                            <div className="player-holder">
                                <div className="player-inner">
                                    {this.state.isPlaying &&
                                        <ReactPlayer url={'https://www.youtube.com/watch?v=' + this.props.file} volume={this.state.volume} playing={this.state.isPlaying} controls={true} />
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