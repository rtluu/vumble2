import React, { Component } from 'react';
import Player from './Player';
import styled from "styled-components";

const VideoListStyled = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    padding-top: 1rem;
    
    .grid{
        display: grid;
        align-items: stretch;
        grid-template-columns: 100%;
        justify-content: space-evenly;	
        max-width: 72rem;
        width: 100%;

        &.column{
            grid-template-columns: 30% 30% 30%;
            grid-gap: 3rem 0;

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
        var grid = {};
        if (this.props.gridView) {
            grid.class = 'grid column';
        } else {
            grid.class = 'grid';
        }
        const files = this.props.files;
        return (
            <VideoListStyled>
                <div className={grid.class}>
                    {files.map((file) => (
                        <Player key={file.data.id} file={file} gridView={this.props.gridView} />
                    ))}
                </div>
            </VideoListStyled>
        );
    }
}