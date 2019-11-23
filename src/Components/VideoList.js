import React, { Component } from 'react';
import Player from './Player';
import styled from "styled-components";

const VideoListStyled = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: flex-start;
    padding-top: 1rem;
    width: 100%;
    
    .video-list{
        align-items: center;
        display: grid;
        grid-template-columns: 100%;
        max-width: 72rem;  
        width: 100%
        

        &.grid{
            align-items: stretch;
            grid-template-columns: 30% 30% 30%;
            grid-gap: 3rem 0;
            justify-content: space-evenly;	

            .iBniid{
                &:nth-child(1){
                    grid-column: 1 / -1;
                    flex-direction: row;

                    .post-block{
                        max-width: none;

                        .iframe-blocker{
                            display: flex;
                            flex-direction: row;

                            &:after{
                                content: '';
                                display: inline-block;
                                padding: 0.75rem;
                                max-width: 15rem !important;
                                min-width: 15rem !important;
                            }
                            .iframe-icons{
                                padding-bottom: 45.5%;
                            }
                        }

                        .post-card{
                            display: flex;
                            flex-direction: row;

                            .thumbnail-container{
                                padding-bottom: 45.5%;
                            }

                            .player-container{
                                .player-holder{
                                    padding-bottom: 45.5%;
                                    &:after{
                                        content: '';
                                        display: inline-block;
                                        padding: 0.75rem;
                                        min-width: 15rem !important;
                                    }
                                }
                            }

                            .post-info{
                                max-width: 15rem !important;
                                min-width: 15rem !important;
                            }
                        }
                    }
                }
            }
            
            
            width: 100%;

            @media (max-width: 60rem) {
                grid-template-columns: 45% 45%;
                grid-gap: 2rem 0;
            }

            @media (max-width: 40rem) {
                grid-template-columns: 90%;
                grid-gap: 1rem 0;
            }
        }
    }
`

export default class VideoList extends Component {
    constructor(props) {
        super(props);

        this.state = {

        };

    }

    render() {
        const files = this.props.files;


        var list = {};
        if (this.props.gridView && !this.state.isMobile) {
            list.class = 'video-list grid';
        } else {
            list.class = 'video-list';
        }

        return (
            <VideoListStyled>
                <div className={list.class}>
                    {files.map((file, index) => (
                        <Player key={file.data.id} index={index} file={file} gridView={this.props.gridView} isMobile={this.state.isMobile} />
                    ))}
                </div>
                {!files.length > 0 &&
                    <h2>Loading videos...</h2>
                }
            </VideoListStyled>
        );
    }
}