import React from 'react';
import Player from './Player';

const VideoList = ({ files }) => {
    return (
        <div className="row">
            {files.map((file) => (
                <Player file={file} />
            ))}
        </div>
    );
}

export default VideoList;