(this.webpackJsonpVumble=this.webpackJsonpVumble||[]).push([[0],{36:function(e,t,n){e.exports=n(54)},41:function(e,t,n){},42:function(e,t,n){},53:function(e,t,n){e.exports=n.p+"static/media/vumble-logo.5ab8b2ab.svg"},54:function(e,t,n){"use strict";n.r(t);var a=n(0),i=n.n(a),o=n(30),r=n.n(o),s=(n(41),n(4)),d=n(5),l=n(9),c=n(6),u=n(1),m=n(10),h=n(7),p=(n(42),n(8)),b=n(31),f=n.n(b),g=n(13);function v(){var e=Object(h.a)(["\n    display: flex;\n    align-items: stretch;\n    flex-direction: column;\n    margin: 1.5rem 0;\n\n    .waypoint{\n        position: absolute;\n        top: 50%;\n    }\n\n    .post-block{\n        max-width: 50rem;\n        position: relative;\n        width: 100%;\n\n        &.expanded{\n            position: fixed;\n            background: rgba(0,0,0,0.9);\n            z-index: 100;\n            bottom: 0;\n            left: 0;\n            right: 0;\n            top: 0;\n            max-width: none;\n            width: 100%;\n\n            .post-card{\n                max-width: 72rem;\n                left: 50%;\n                top: 50%;\n                transform: translate(-50%, -50%);\n                width: calc(100% - 4rem);\n                z-index: 3;\n\n                @media (max-width: 40rem) {\n                    width: 100%;\n                }\n\n                .thumbnail-container{\n                    display: none;\n                }\n    \n                .player-container{\n                    position: relative;\n\n                    .player-holder{\n                        div{\n                            transform: translateY(0);\n                            height: 100% !important;\n                            width: 100% !important;\n                        }\n                    }\n                    \n                    .time-box{\n                        display: none;\n                    }\n                }\n                .post-info{\n                    padding: 0.75rem;\n                    .post-title{\n                        font-size: 1.25rem;\n                    }  \n                }\n            } \n        }\n\n        .iframe-blocker{\n            cursor: pointer;\n            position: absolute;\n            bottom: 0;\n            left: 0;\n            right: 0;\n            top: 0;\n            text-align: left;\n            z-index: 2;\n\n            @media (hover: hover) {\n                &:hover{\n                    .expand-button{\n                        &.show{\n                            opacity: 1;\n                        }\n                    }\n                }\n            }\n\n            @media (hover: none) {\n                .expand-button{\n                    &.show{\n                        opacity: 1;\n                    }\n                }\n            }\n\n            .expand-button{\n                background: rgba(0,0,0,0.2);\n                border: 0.0675rem solid white;\n                border-radius: 0.25rem;\n                color: white;\n                cursor: pointer;\n                font-size: 0.75rem;\n                font-weight: 700;\n                margin: 0.75rem;\n                opacity: 0;\n                outline: none;\n                position: relative;\n                padding: 0.25rem 0.5rem;\n                transition: all 0.2s;\n\n                &:hover{ \n                    background: rgba(0,0,0,0.8);\n                }\n\n\n                &.hide{\n                    display: none;\n                }\n            }\n        }\n\n        .post-card{\n            background: white;\n            border-radius: 0.25rem;\n            box-shadow: 0 0.0675rem 0.25rem 0 rgba(0,0,0,0.15);\n            position: relative;\n            overflow: hidden;\n            text-align: left;\n\n            .thumbnail-container{\n                overflow: hidden;\n                position: relative;\n                padding-bottom: 56.25%;\n                width: 100%;\n \n                .thumbnail{\n                    bottom: 0;\n                    left: 0;\n                    position: absolute;\n                    right: 0;\n                    top: 0;\n                    transform: translateY(-12.5%);\n                    width: 100%;\n                }\n            }\n\n            .player-container{\n                cursor: pointer;\n                position: absolute;\n                bottom: 0;\n                left: 0;\n                right: 0;\n                top: 0;\n                z-index: 1;\n \n                .player-holder{\n                    padding-bottom: 56.25%;\n                    position: relative;\n                    overflow: hidden;\n                    top: 0;\n\n                    &:after{\n                        border-radius: 2rem 0 0 0;\n                        box-shadow: -1rem -1rem 4rem 1.5rem rgba(0,0,0,0.4);\n                        content: '';\n                        position: absolute;\n                        bottom: 0;\n                        right: 0;\n                        height: 0;\n                        width: 0;\n                        z-index: 2;\n                    }\n                    \n \n                    .player-inner{\n                        position: absolute;\n                        bottom: 0;\n                        left: 0;\n                        right: 0;\n                        top: 0;  \n                    }\n                    div{\n                        transform: translateY(-30.005%);\n                        height: 250% !important;\n                        width: 100% !important;\n                    }\n \n                    \n                    .time-box{\n                        bottom: 0;\n                        position: absolute;\n                        padding: 0.25rem;\n                        margin: 0.125rem;\n                        right: 0;\n                        opacity: 0;\n                        z-index: 3;\n                        transition: all 0.2s;\n\n                        &.show{\n                            opacity: 1;\n                        }\n\n                        .time-left{\n                            color: white;\n\n                            .spacer{\n                                display: inline-block;\n                                position: relative;\n                                height: 0.2rem\n                                width: 0.0675rem;\n                            }\n                        }\n                    }\n                }  \n            }\n            .post-info{\n                padding: 0.5rem 0.75rem;\n                \n                .post-title{\n                    margin-bottom: 0.5rem;\n                }\n            }\n        }\n    }\n"]);return v=function(){return e},e}var w=p.a.div(v()),y=function(e){function t(e){var n;Object(s.a)(this,t),(n=Object(l.a)(this,Object(c.a)(t).call(this,e))).handleDuration=function(e){n.setState({duration:e})},n.handleProgress=function(e){var t=Math.round(e.playedSeconds),a=n.state.duration-t,i=Math.floor(a/60),o=Math.floor(a%60);o<10&&(o="0"+o),n.setState({minutesLeft:i}),n.setState({secondsLeft:o})};var a=n.props.file.data,i=a.title,o=a.ups,r=a.url,d="",m="",h="";return"youtube.com"===a.domain|"youtu.be"===a.domain|"m.youtube.com"===a.domain&&!a.url.includes("/channel/")&&!a.url.includes("/playlist")?((d=r.includes(".be/")?r.split(".be/")[1]:r.includes("/embed/")?r.split("/embed/")[1]:r.split("v=")[1]).includes("&")?d=d.split("&")[0]:d.includes("?t")&&(d=d.split("?t")[0]),m="https://www.youtube.com/watch?v="+d,h="https://img.youtube.com/vi/"+d+"/0.jpg"):"v.redd.it"===a.domain?(a.crosspost_parent?(r=a.crosspost_parent_list[0].preview.images[0].source.url,m=a.crosspost_parent_list[0].media.reddit_video.fallback_url):(r=a.preview.images[0].source.url,m=a.media.reddit_video.fallback_url),h=r=r.split("&amp;").join("&")):"gfycat.com"===a.domain&&(m="https://thumbs.gfycat.com/"+(d=(r=(r=a.crosspost_parent?a.crosspost_parent_list[0].media.oembed.thumbnail_url:a.media.oembed.thumbnail_url).split(".com/")[1]).split("-size")[0])+"-mobile.mp4",h="https://thumbs.gfycat.com/"+d+"-mobile.jpg"),n.state={url:m,thumbnail:h,title:i,upvotes:o,isExpanded:!1,isPlaying:!1,muted:!0,isReady:!1,duration:0,played:0,loaded:0,minutesLeft:"0",secondsLeft:"00"},n.vidReady=n.vidReady.bind(Object(u.a)(n)),n.vidPlay=n.vidPlay.bind(Object(u.a)(n)),n.vidStop=n.vidStop.bind(Object(u.a)(n)),n.expandVideo=n.expandVideo.bind(Object(u.a)(n)),n.closeVideo=n.closeVideo.bind(Object(u.a)(n)),n.handleDuration=n.handleDuration.bind(Object(u.a)(n)),n}return Object(m.a)(t,e),Object(d.a)(t,[{key:"vidReady",value:function(){this.setState({isReady:!0})}},{key:"vidPlay",value:function(){this.setState({isPlaying:!0})}},{key:"vidStop",value:function(){this.setState({isPlaying:!1}),this.setState({muted:!0}),this.setState({isReady:!1})}},{key:"expandVideo",value:function(){this.setState({isExpanded:!0}),this.setState({muted:!1}),this.setState({isPlaying:!0})}},{key:"closeVideo",value:function(){this.setState({isExpanded:!1}),this.setState({muted:!0}),this.setState({isReady:!1})}},{key:"render",value:function(){var e={};return this.state.isReady|this.state.isPlaying?(e.button="expand-button show",e.time="time-box show"):(e.button="expand-button",e.time="time-box"),this.state.isExpanded?(e.expand="post-block expanded",e.mouseEnter=void 0,e.mouseLeave=void 0,e.blocker=this.closeVideo,e.button="expand-button hide"):(e.expand="post-block",e.mouseEnter=this.vidPlay,e.mouseLeave=this.vidStop,e.blocker=this.expandVideo),this.props.gridView||(e.mouseEnter=void 0,e.mouseLeave=void 0),i.a.createElement(w,null,!this.props.gridView&&!this.state.isExpanded&&i.a.createElement(g.a,{onEnter:this.vidPlay,bottomOffset:"30%"}),i.a.createElement("div",{className:e.expand},i.a.createElement("div",{className:"iframe-blocker",onMouseEnter:e.mouseEnter,onMouseLeave:e.mouseLeave,onClick:e.blocker},i.a.createElement("button",{className:e.button},"Click to expand w/sound")),i.a.createElement("div",{className:"post-card"},i.a.createElement("div",{className:"thumbnail-container"},i.a.createElement("img",{className:"thumbnail",src:this.state.thumbnail})),i.a.createElement("div",{className:"player-container"},i.a.createElement("div",{className:"player-holder"},i.a.createElement("div",{className:"player-inner"},this.state.isPlaying&&i.a.createElement(f.a,{url:this.state.url,volume:this.state.volume,playing:this.state.isPlaying,controls:!0,muted:this.state.muted,onReady:this.vidReady,onDuration:this.handleDuration,onProgress:this.handleProgress})),i.a.createElement("span",{className:e.time},i.a.createElement("p",{className:"time-left"},"-",i.a.createElement("span",{className:"spacer"}),this.state.minutesLeft,":",this.state.secondsLeft)))),i.a.createElement("div",{className:"post-info"},i.a.createElement("h3",{className:"post-title"},this.state.title),i.a.createElement("h6",{className:"post-votes"},this.state.upvotes," upvotes")))),!this.props.gridView&&!this.state.isExpanded&&i.a.createElement(g.a,{onLeave:this.vidStop,topOffset:"30%"}))}}]),t}(a.Component);function S(){var e=Object(h.a)(["\n    display: flex;\n    align-items: center;\n    flex-direction: column;\n    justify-content: center;\n    padding-top: 3.75rem;\n    \n    .grid{\n        display: grid;\n        align-items: stretch;\n        grid-template-columns: 100%;\n        justify-content: space-evenly;\t\n\n        &.column{\n            grid-template-columns: 30% 30% 30%;\n            grid-gap: 3rem 0;\n\n            @media (max-width: 60rem) {\n                grid-template-columns: 45% 45%;\n                grid-gap: 2rem 0;\n            }\n\n            @media (max-width: 40rem) {\n                grid-template-columns: 90%;\n                grid-gap: 1rem 0;\n            }\n        }\n    }\n"]);return S=function(){return e},e}var x=p.a.div(S()),k=function(e){function t(e){var n;return Object(s.a)(this,t),(n=Object(l.a)(this,Object(c.a)(t).call(this,e))).state={gridView:!0},n.setList=n.setList.bind(Object(u.a)(n)),n.setGrid=n.setGrid.bind(Object(u.a)(n)),n}return Object(m.a)(t,e),Object(d.a)(t,[{key:"setList",value:function(){this.setState({gridView:!1})}},{key:"setGrid",value:function(){this.setState({gridView:!0})}},{key:"render",value:function(){var e=this,t={};this.state.gridView?t.class="grid column":t.class="grid";var n=this.props.files;return i.a.createElement(x,null,i.a.createElement("div",{className:"layout-switch"},i.a.createElement("button",{onClick:this.setGrid},"Grid"),i.a.createElement("button",{onClick:this.setList},"List")),i.a.createElement("div",{className:t.class},n.map((function(t){return i.a.createElement(y,{key:t.data.id,file:t,gridView:e.state.gridView})}))))}}]),t}(a.Component);function E(){var e=Object(h.a)(["\n  \n  // Header Styling\n  header{\n    background: #2A2B2A;\n    display: flex;\n    flex-direction: row;\n    justify-content: flex-start;\n    padding: .75rem 1.5rem;\n    position: fixed;\n    width: 100%;\n    z-index: 5;\n\n    img{\n      display: block;\n      max-width: 7rem;\n\n      @media (max-width: 50rem) {\n          max-width: 6rem;\n      }\n\n    }\n\n    .sub-sort{\n      display: flex;\n      flex-direction: row;\n      position: relative;\n      margin-left: 1rem;\n      \n      .dropdown{\n        margin: 0 0.25rem;\n        position: relative;\n\n        .dropdown-toggle{\n          align-items: center;\n          border-color: white;\n          color: white;\n          display: flex;\n          justify-content: center;\n          font-size: 1.125rem;\n          transition: all 0.1s;\n\n          @media (max-width: 50rem) {\n            font-size: 1rem;\n          }\n\n          @media (hover: hover) {\n            &:hover{\n              background: white;\n              color: black;\n\n              .down-arrow{\n                border-color: black;\n              }\n            }\n          }\n\n          &.active{\n            background: white;\n            color: black;\n\n            .down-arrow{\n              border-color: black;\n            }\n          }\n\n          .down-arrow{\n            box-sizing: border-box;\n            border-style: solid;\n            border-color: white;\n            border-width: 0 0.125rem 0.125rem 0;\n            display: inline-block;\n            height: 0.5rem;\n            margin-left: 0.25rem;\n            transform: rotate(45deg) translateY(-0.0675rem);\n            width: 0.5rem;\n            transition: all 0.1s;\n          }\n        }\n    \n        .dropdown-menu{\n          background: white;\n          border-radius: 0.25rem;\n          box-shadow: 0 0.125rem 0.25rem 0 rgba(0,0,0,0.5);\n          display: none;\n          flex-direction: column;\n          position: absolute;\n\n          &.open{\n            display: flex;\n          }\n\n          .dropdown-item{\n            color: black;\n            padding: 0.5rem;\n            font-size: 1.125rem;\n\n            @media (hover: hover) {\n              &:hover{\n                background: black;\n                color: white;\n              }\n            }\n          }\n        } \n      }\n    }\n  }\n\n  // Main Container\n  .main-container{\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n\n    .pagination{\n      display: block;\n      margin: 2rem 0;\n      text-align: center;\n\n      .page-switch{\n        display: inline-block;\n        padding: 1rem;\n        position: relative;\n      }\n    }\n  }\n"]);return E=function(){return e},e}var j=p.a.div(E()),N=n(53),O=function(e){function t(e){var n;return Object(s.a)(this,t),(n=Object(l.a)(this,Object(c.a)(t).call(this,e))).state={currentSubreddit:"videos",files:[],page:1,after:null,before:null,sort:"hot",dropdownOpen:!1},n.nextPage=function(){console.log("newpage"),fetch(n.url+"r/"+n.state.currentSubreddit+"/"+n.state.sort+".json?count="+25*n.state.page+"&after="+n.state.after).then((function(e){return e.json()})).then((function(e){var t=e.data.children,a=0,i=n.state.files;for(a=0;a<t.length;a++)"youtube.com"===t[a].data.domain|"youtu.be"===t[a].data.domain|"m.youtube.com"===t[a].data.domain&&!t[a].data.url.includes("/channel/")&&!t[a].data.url.includes("/playlist")?i.push(t[a]):"v.redd.it"===t[a].data.domain&&i.push(t[a]);n.setState((function(){return{files:i,after:e.data.after,before:e.data.before,page:n.state.page+1}}))})).catch(console.log)},n.videosSubreddit="videos",n.artisanSubreddit="artisanvideos",n.documentarySubreddit="documentaries",n.haikuSubreddit="youtubehaiku",n.subredditsArray=["mealtimevideos","music","woahdude"],n.url="https://www.reddit.com/",n.sorts=["hot","new","top"],n.dropdownSub=n.dropdownSub.bind(Object(u.a)(n)),n.dropdownSort=n.dropdownSort.bind(Object(u.a)(n)),n.nextPage=n.nextPage.bind(Object(u.a)(n)),n}return Object(m.a)(t,e),Object(d.a)(t,[{key:"componentDidMount",value:function(){this.changeSubreddit(this.state.currentSubreddit)}},{key:"changeSubreddit",value:function(e){var t=this;this.setState({files:[],currentSubreddit:e,page:1,dropdownOpen:!1}),fetch(this.url+"r/"+e+"/"+this.state.sort+".json").then((function(e){return e.json()})).then((function(e){var n=e.data.children,a=0,i=[];for(a=0;a<n.length;a++)"youtube.com"===n[a].data.domain|"youtu.be"===n[a].data.domain|"m.youtube.com"===n[a].data.domain&&!n[a].data.url.includes("/channel/")&&!n[a].data.url.includes("/playlist")?i.push(n[a]):"v.redd.it"===n[a].data.domain?i.push(n[a]):"gfycat.com"===n[a].data.domain&&i.push(n[a]);t.setState({files:i,after:e.data.after,before:e.data.before}),window.scrollTo(0,0)})).catch(console.log)}},{key:"changeSort",value:function(e){var t=this;this.setState({files:[],sort:e,page:1,dropdownOpen:!1}),fetch(this.url+"r/"+this.state.currentSubreddit+"/"+e+".json").then((function(e){return e.json()})).then((function(e){var n=e.data.children,a=0,i=[];for(a=0;a<n.length;a++)"youtube.com"===n[a].data.domain|"youtu.be"===n[a].data.domain|"m.youtube.com"===n[a].data.domain&&!n[a].data.url.includes("/channel/")&&!n[a].data.url.includes("/playlist")?i.push(n[a]):"v.redd.it"===n[a].data.domain&&i.push(n[a]);t.setState({files:i,after:e.data.after,before:e.data.before}),window.scrollTo(0,0)})).catch(console.log)}},{key:"searchSubreddit",value:function(e){0!==e.length?this.changeSubreddit(e):this.changeSubreddit(this.videosSubreddit)}},{key:"dropdownSub",value:function(){this.setState({dropdownSub:!this.state.dropdownSub})}},{key:"dropdownSort",value:function(){this.setState({dropdownSort:!this.state.dropdownSort})}},{key:"render",value:function(){var e,t,n=this;if(e=this.state.currentSubreddit===this.videosSubreddit?"Videos":this.state.currentSubreddit===this.documentarySubreddit?"Documentaries":this.state.currentSubreddit===this.artisanSubreddit?"Artisan Videos":this.state.currentSubreddit===this.haikuSubreddit?"YouTube Haiku":""+this.state.currentSubreddit,this.state.files.length>0){var a,o=i.a.createElement("button",{className:"next-button",type:"submit",onClick:this.nextPage},"More");a=null===this.state.before&&null!==this.state.after?i.a.createElement("div",null,o):null!==this.state.before&&null!==this.state.after?i.a.createElement("div",{className:"page-switch"},o):i.a.createElement("div",{className:"page-switch"},"That's all the videos we found!"),t=i.a.createElement("div",{className:"main-container"},i.a.createElement(k,{files:this.state.files}),i.a.createElement("div",{className:"pagination"},a))}else t=i.a.createElement("div",{className:"main-container"},i.a.createElement("h3",null,"No videos found \ud83e\uddd0"));var r={};return this.state.dropdownSub?(r.toggleSub="dropdown-toggle active",r.menuSub="dropdown-menu open"):(r.toggleSub="dropdown-toggle",r.menuSub="dropdown-menu"),this.state.dropdownSort?(r.toggleSort="dropdown-toggle active",r.menuSort="dropdown-menu open"):(r.toggleSort="dropdown-toggle",r.menuSort="dropdown-menu"),i.a.createElement(j,null,i.a.createElement("header",{className:"App-header"},i.a.createElement("a",{href:"/"},i.a.createElement("img",{alt:"Vumble-Logo",src:N})),i.a.createElement("div",{className:"sub-sort"},i.a.createElement("div",{className:"dropdown"},i.a.createElement("button",{className:r.toggleSub,onClick:this.dropdownSub,type:"button"},"r/",e,i.a.createElement("span",{className:"down-arrow"})),i.a.createElement("div",{className:r.menuSub},i.a.createElement("a",{className:"dropdown-item",href:"#subChange",onClick:function(){return n.changeSubreddit(n.videosSubreddit)}},"r/videos"),i.a.createElement("a",{className:"dropdown-item",href:"#subChange",onClick:function(){return n.changeSubreddit(n.documentarySubreddit)}},"r/documentaries"),i.a.createElement("a",{className:"dropdown-item",href:"#subChange",onClick:function(){return n.changeSubreddit(n.artisanSubreddit)}},"r/artisanvideos"),i.a.createElement("a",{className:"dropdown-item",href:"#subChange",onClick:function(){return n.changeSubreddit(n.haikuSubreddit)}},"r/youtubehaiku"),this.subredditsArray.map((function(e,t){return i.a.createElement("a",{className:"dropdown-item",key:t,href:"#subChange",onClick:function(){return n.changeSubreddit(e)}},"r/",e)})))),i.a.createElement("div",{className:"dropdown"},i.a.createElement("button",{className:r.toggleSort,onClick:this.dropdownSort,type:"button"},this.state.sort),i.a.createElement("div",{className:r.menuSort,"aria-labelledby":"dropdownMenuButton"},this.sorts.map((function(e,t){return i.a.createElement("a",{className:"dropdown-item",key:t,href:"#subChange",onClick:function(){return n.changeSort(e)}},e)})))))),t,i.a.createElement("div",{className:"waypoint"}))}}]),t}(i.a.Component);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));r.a.render(i.a.createElement(O,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()}))}},[[36,1,2]]]);
//# sourceMappingURL=main.7b1f5ff1.chunk.js.map