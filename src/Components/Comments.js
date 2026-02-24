import React, { Component } from "react";
import styled from "styled-components";

const CommentsStyled = styled.div`
    background: white;
    padding: 0.75rem 0.75rem 2rem;

    .comments-header {
        color: #D3D3D3;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin-bottom: 0.25rem;
        text-transform: uppercase;
    }

    .comment {
        border-top: 0.0675rem solid #e2e2e2;
        padding: 0.75rem 0;

        .comment-meta {
            align-items: center;
            display: flex;
            flex-direction: row;
            gap: 0.5rem;
            margin-bottom: 0.375rem;

            .comment-author {
                color: #2A2B2A;
                font-size: 0.75rem;
                font-weight: 700;
            }

            .comment-score {
                color: #D3D3D3;
                font-size: 0.75rem;
            }
        }

        .comment-body {
            color: #555;
            font-size: 0.875rem;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
        }
    }

    .comments-status {
        color: #D3D3D3;
        font-size: 0.875rem;
        padding: 1.5rem 0;
        text-align: center;
    }
`

function formatScore(score) {
    if (score >= 1000) {
        return (score / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return score;
}

export default class Comments extends Component {
    constructor(props) {
        super(props);
        this.state = {
            comments: [],
            loading: true,
            error: false,
        };
    }

    componentDidMount() {
        fetch('https://www.reddit.com' + this.props.permalink + '.json?sort=top&limit=50')
            .then(res => res.json())
            .then(data => {
                const comments = data[1].data.children
                    .filter(c => c.kind === 't1' && c.data.body !== '[deleted]' && c.data.body !== '[removed]' && c.data.author !== '[deleted]')
                    .map(c => c.data);
                this.setState({ comments, loading: false });
            })
            .catch(() => this.setState({ loading: false, error: true }));
    }

    render() {
        const { loading, error, comments } = this.state;

        if (loading) {
            return <CommentsStyled><p className="comments-status">Loading comments...</p></CommentsStyled>;
        }

        if (error || !comments.length) {
            return <CommentsStyled><p className="comments-status">No comments found</p></CommentsStyled>;
        }

        return (
            <CommentsStyled>
                <p className="comments-header">{comments.length} Comments</p>
                {comments.map(comment => (
                    <div className="comment" key={comment.id}>
                        <div className="comment-meta">
                            <span className="comment-author">{comment.author}</span>
                            <span className="comment-score">↑ {formatScore(comment.score)}</span>
                        </div>
                        <p className="comment-body">{comment.body}</p>
                    </div>
                ))}
            </CommentsStyled>
        );
    }
}
