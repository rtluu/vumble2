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
        border-top: 1px solid red;
        max-width: 50rem;
        position: relative;
        padding: 5rem 0;
        width: 100%;

        .video-holder{
            position: relative;

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
                transition: all 0.3s linear 0s;
                
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

export default class Video extends Component {
    constructor(props) {
        super(props);


        this.state = {
            isPlaying: false,
        };

        this.vidPlay = this.vidPlay.bind(this);
        this.vidPause = this.vidPause.bind(this);
    }

    vidPlay() {
        this.setState({ isPlaying: true });
        console.log('play', this.props.file);
    }

    vidPause() {
        this.setState({ isPlaying: false });
        console.log('pause', this.props.file);
    }


    render() {
        var holder = {};
        if (this.state.menuShow) {
            holder.class = 'holder show';
        } else {
            holder.class = 'holder';
        }

        return (
            <VideoStyled>
                <Waypoint onEnter={this.vidPlay} bottomOffset={'30%'} />
                <div className="video-block">
                    <div className="video-holder">
                        <div className="thumbnail-container">
                            <img className="thumbnail" src={'https://img.youtube.com/vi/' + this.props.file + '/0.jpg'} />
                        </div>
                        <div className="player-container">
                            <div className="player-holder">
                                <div className="player-inner">
                                    {this.state.isPlaying &&
                                        <ReactPlayer url={'https://www.youtube.com/watch?v=' + this.props.file} volume={0} playing={this.state.isPlaying} />
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Waypoint onLeave={this.vidPause} topOffset={'30%'} />
            </VideoStyled >
        )
    }
}