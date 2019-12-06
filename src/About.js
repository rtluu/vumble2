import React from 'react';
import './App.css';
import styled from "styled-components";
import { Link } from 'react-router-dom';
import Footer from './Components/Footer';
import ReactGA from 'react-ga';

ReactGA.initialize('UA-152512551-1');
ReactGA.pageview('/about');


const AboutStyled = styled.div`

    header{
        background: #2A2B2A;
        position: fixed;
        width: 100%;
        z-index: 12;

        .header-options{
            align-items: center;
            display: flex;
            box-sizing: border-box;
            flex-direction: row;
            justify-content: space-between;
            padding:  0.75rem 2% 0.75rem 2%;
            max-width: 72rem;
            width: 100%;

            @media (max-width: 60rem) {
                padding:  0.75rem 3.33% 0.75rem 3.33%;
            }

            @media (max-width: 40rem) {
                padding:  0.75rem 5% 0.75rem 5%;
            }

            .logo-holder{
                @media (max-width: 50rem) {
                overflow: hidden;
                max-width: 1.75rem;
                }

                img{
                    display: block;
                    max-width: 7rem;
                
                    @media (max-width: 50rem) {
                        max-width: 6rem;
                    }
                }
            }

            .menu{
                align-items: center;
                background: white;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                justify-content: center; 
                height: 1.75rem;
                width: 1.75rem;
        
                @media (max-width: 50rem) {
                  height: 1.5rem;
                  width: 1.5rem;
                }
        
                @media (hover: hover) {
                  &:hover{ 
                      background: #FFCF20;
                  }
                }
        
                .i{
                  color: black;
                  font-size: 1.25rem;
                  @media (max-width: 50rem) {
                    font-size: 1rem;
                  }
                }
              }
        }
    }

    .about-container{
        display: flex;
        align-items: center;
        flex-direction: column;
        justify-content: center;

        .about-inner{
            max-width: 50rem;
            margin-top: 5rem;
            padding: 0 2rem 2rem 2rem;
            @media (max-width: 50rem) {
                padding: 0 1.75rem 1.75rem 1.75rem;
            }

            .banner{
                position: relative;
                width: 100%;
                margin-bottom: 2rem;
                @media (max-width: 50rem) {
                    margin-bottom: 1.75rem;
                }
            }

            .about-text{
                font-size: 1.125rem;
                line-height: 1.675rem;
                padding-bottom: 1.5rem;

                @media (max-width: 50rem) {
                    font-size: 1rem;
                    padding-bottom: 1.25rem;
                }
            }

            .divider{
                background: #dbdbdb;
                height: 2px;
                margin: 0.5rem 0 2rem 0;
                position: relative;
                width: 100%;
            }
        }
    }

`

class About extends React.Component {

    render() {
        const logo = require("./images/vumble-logo.svg");
        const aboutImg = require("./images/about-banner.png");
        return (
            <AboutStyled>
                <header className="App-header">
                    <div className="header-options">
                        <div className="logo-holder"><a href="/"><img alt="Vumble logo" src={logo} /></a></div>
                        <Link className="menu" to="/about">
                            <span className="i">i</span>
                        </Link>
                    </div>
                </header>
                <div className="about-container">
                    <div className="about-inner">
                        <img className="banner" alt="Vumble about" src={aboutImg} />
                        <p className="about-text">Vumble pulls all the best videos from Reddit and makes them easy to enjoy.</p>
                        <p className="about-text">The goal is to present Reddit videos in a laid back experience similar to the original Reddit TV.</p>
                        <p className="about-text">This is actually the second iteration of Vumble. It was originally launched back in 2016, but the code became frail and eventually deprecated beyond repair.</p>
                        <div className="divider" />
                        <p className="about-text">Now, I'm open sourcing the code and rebuilding it in React. This current version is very much a prototype and you’ll notice that there are some limitations like videos from Reddit don’t have sound. Unfortunately, Reddit only exposes a fallback url that doesn’t have audio.</p>
                        <p className="about-text">I’d love to hear your feedback to help priortize what to work on next and if you interested in contributing, <a href="mailto:ryan@vumble.com">shoot me a message.</a></p>
                    </div>
                </div>
                <Footer />
            </AboutStyled>
        );
    }


}

export default About;