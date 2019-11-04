import React, { Component } from 'react';
import styled from "styled-components";


const FooterStyled = styled.footer`
    align-items: stretch;
    display: flex;
    justify-content: center;
    margin: 0.75rem 0;
    width: 100%;

    .footer-options{
      align-items: center;
      display: flex;
      box-sizing: border-box;
      flex-direction: row;
      justify-content: space-between;
      padding:  1rem 2% 1rem 2%;
      max-width: 72rem;
      width: 100%;

      @media (max-width: 60rem) {
        padding:  1rem 3.33% 1rem 3.33%;
      }

      @media (max-width: 40rem) {
        padding:  1rem 5% 1rem 5%;
      }

      p{
        a{
          color: #2A2B2A;
          &:hover{
            text-decoration: underline;
          }
        }
      }

      .bee-holder{
          border: 0;
          left: 50%;
          margin-top: -0.125rem;
          position: absolute;
          transform: translateX(-50%);
          

          &:active{
            img{
                animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
              }
          }

          @media (hover: hover) {
            &:hover{
              img{
                animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
              }
            }
          }

        img{
            height: 1.325rem
            position: relative;
            width: 1.5rem;
        }
      }
    }
  }

  @keyframes shake {
    10%, 90% {
      transform: translate3d(-0.0675rem, 0, 0);
    }
    
    20%, 80% {
      transform: translate3d(0.125rem, 0, 0);
    }
  
    30%, 50%, 70% {
      transform: translate3d(-0.0675rem, 0, 0);
    }
  
    40%, 60% {
      transform: translate3d(0.1875rem, 0, 0);
    }
`

export default class Player extends Component {
    constructor(props) {
        super(props);

    }
    state = {

    }

    render() {
        const bee = require("./images/vumble-bee.png")

        return (
            <FooterStyled>
                <div className="footer-options">
                    <p><a href="https://github.com/rtluu/vumble2">Github</a></p>

                    <button className='bee-holder'>
                        <img className="bee" src={bee} />
                    </button>

                    <p>© Vumble 2019</p>
                </div>
            </FooterStyled>
        )

    }
};
