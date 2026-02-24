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
            grid-gap: 1rem 0;
            justify-content: space-evenly;

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
    state = {
        expandedIndex: null,
    };

    handleExpand = (index) => {
        this.setState({ expandedIndex: index });
    }

    handleClose = () => {
        this.setState({ expandedIndex: null });
    }

    handlePrev = () => {
        this.setState(s => ({ expandedIndex: s.expandedIndex - 1 }));
    }

    handleNext = () => {
        this.setState(s => ({ expandedIndex: s.expandedIndex + 1 }));
    }

    render() {
        const files = this.props.files;
        const { expandedIndex } = this.state;

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
                        <Player
                            key={file.data.id}
                            file={file}
                            gridView={this.props.gridView}
                            isMobile={this.state.isMobile}
                            isExpanded={expandedIndex === index}
                            onExpand={() => this.handleExpand(index)}
                            onClose={this.handleClose}
                            onPrev={expandedIndex > 0 ? this.handlePrev : null}
                            onNext={expandedIndex < files.length - 1 ? this.handleNext : null}
                        />
                    ))}
                </div>
                {!files.length > 0 &&
                    <h2>Loading videos...</h2>
                }
            </VideoListStyled>
        );
    }
}
