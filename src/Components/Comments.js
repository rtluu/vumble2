import React, { Component } from "react";
import styled from "styled-components";

import snoowrap from 'snoowrap';



const r = new snoowrap({
    userAgent: 'startupjump',
    clientId: 'Li5aWwUW0CwSAQ',
    clientSecret: 'xZ59dsM-DJsWGm2Gnva5g9ZLmE0',
    refreshToken: '22449542-U6K_y-Lq5H5rF7nSNCzhruiky9U'
});

const CommentsStyled = styled.div`
`


export default class Comments extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        var thread = r.getComment('7jtp5k').fetch().then(comment => comment.body).then(console.log)
        console.log(thread);
    }

    render() {
        return (
            <div className="comments">{this.props.permalink}</div>
        )
    }

}