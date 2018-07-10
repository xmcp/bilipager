// ==UserScript==
// @name         bilipager
// @namespace    http://s.xmcp.ml/
// @version      0.2.1
// @description  人类能用的B站分P列表
// @author       xmcp
// @match        *://www.bilibili.com/video/*
// @supportURL   https://github.com/xmcp/bilipager
// @contributionURL https://s.xmcp.ml/pakkujs/donate.png
// @grant        none
// ==/UserScript==

const ZINDEX_NORMAL=999;
const ZINDEX_FULLSCREEN=2147483647;
const WIDTH=300;
const USE_MAGIC_SWITCH=true;
const CSSTEXT=`
.bilipager-list::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}
.bilipager-list::-webkit-scrollbar-track {
    background-color: rgba(255,255,255,.3);
}
.bilipager-list::-webkit-scrollbar-thumb {
    background-color: rgba(128,128,128,.6);
}
.bilipager-list::-webkit-scrollbar-thumb:active {
    background-color: rgba(128,128,128,1);
}

.bilipager-list:empty, .bilipager-popover:empty {
    display: none;
}

.bilipager-list {
    width: ${WIDTH}px;
    position: fixed;
    height: 100%;
    background-color: rgba(225,225,225,.9);
    top: 0;
    left: -${WIDTH-1}px;
    opacity: 0;
    z-index: ${ZINDEX_FULLSCREEN};
    box-sizing: border-box;
    padding: 2em 0;
    overflow-y: auto;
    word-break: break-all;
    transition: left .2s ease-out;
}
.bilipager-list:hover {
    left: 0;
    opacity: 1;
}

.bilipager-list p {
    overflow: hidden;
    padding: .5em 0 .5em .5em;
    cursor: pointer;
    white-space: nowrap;
}

.bilipager-list p code {
    font-family: Consolas, Courier, monospace;
}

.bilipager-list p span {
    font-size: 1.2em;
}

.bilipager-list p:hover {
    background-color: rgba(255,255,255,.8);
    white-space: normal;
}

.bilipager-list p.bilipager-curp {
    background-color: black;
    color: white;
}

.bilipager-popover {
    min-width: 150px;
    position: absolute;
    height: 1.7em;
    line-height: 1.7em;
    font-size: 1.2em;
    padding: 0 .5em;
    background-color: black;
    color: white;
    top: 150px;
    left: 10px;
    z-index: ${ZINDEX_NORMAL};
    border-radius: 3px;
    word-break: break-all;
    white-space: nowrap;
}

.bilipager-popover:before {
    content: "";
    position: absolute;
    width: 0;
    height: 0;
    top: 50%;
    left: -4px;
    margin-top: -5px;
    border-width: 5px 5px 5px 0;
    border-color: transparent;
    border-right-color: black;
    border-style: solid;
}
`;

(function() {
    'use strict';

    let list_root=document.createElement('div');
    list_root.className='bilipager-list';
    list_root.addEventListener('mousewheel',function(e) {
        e.stopPropagation();
    });

    let popover=document.createElement('div');
    popover.className='bilipager-popover';

    let playlist_cache={};

    function format_duration(d) {
        function pad(t) {
            return (''+t).padStart(2,'0');
        }
        return d<3600 ?
            (Math.floor(d/60)+':'+pad(d%60)) :
            (Math.floor(d/3600)+':'+pad(Math.floor((d%3600)/60))+':'+pad(d%60));
    }

    function reload_ui(aid) {
        if(!playlist_cache[aid]) {
            playlist_cache[aid]=fetch('https://api.bilibili.com/x/player/pagelist?aid='+aid).then(res=>res.json());
        }
        playlist_cache[aid].then(function(plist) {
            list_root.textContent='';
            popover.textContent='';
            
            console.log('!!',plist);
            if(plist.data.length<=1) return;

            plist.data.forEach(function(p) {
                let li=document.createElement('p');
                
                let li_1=document.createElement('code');
                li_1.textContent=`[${p.page}] ${format_duration(p.duration)} `;
                li.appendChild(li_1);
                let li_2=document.createElement('span');
                li_2.textContent=`${p.part}`;
                li.appendChild(li_2);
                
                li.addEventListener('click',function() {
                    const paginate_link=document.querySelector(`a.router-link-active[href="/video/av${aid}/?p=${p.page}"]`);
                    if(paginate_link) {
                        console.log('switch: pagniate link');
                        paginate_link.click();
                    } else if(p.page===1 || !USE_MAGIC_SWITCH) {
                        console.log('switch: reload');
                        location.href='//www.bilibili.com/video/av'+aid+'/?p='+p.page;
                    } else {
                        console.log('switch: magic');
                        // go to previous p
                        window.bilibiliPlayer({aid:aid, cid:''+plist.data[p.page-2].cid, p:''+p.page});
                        // then press the "next" button
                        let retry_cnt=50;
                        setTimeout(function self() {
                            const btn=document.querySelector('.bilibili-player-iconfont.bilibili-player-iconfont-next');
                            if(btn) {
                                btn.click();
                            } else if(retry_cnt--) {
                                setTimeout(self,200);
                            } else { // failed
                                location.reload();
                            }
                        },400);
                        // set the url
                        history.pushState({},'','//www.bilibili.com/video/av'+aid+'/?p='+p.page);
                    }
                });
                list_root.appendChild(li);
                
                if(p.cid===parseInt(window.cid)) {
                    li.className='bilipager-curp';
                    if(li.scrollIntoViewIfNeeded) {
                        li.scrollIntoViewIfNeeded();
                    } else {
                        li.scrollIntoView(false);
                    }
                    popover.textContent=`[${p.page}/${plist.data.length}] ${p.part}`;
                }
            });
        });
    }

    function setup_listener() {
        function onfschange(e) {
            const elem=document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.body;
            if(list_root.parentNode!==elem) {
                if(list_root.parentNode) {
                    list_root.parentNode.removeChild(list_root);
                }
                elem.appendChild(list_root);
            }
        }
        document.addEventListener('fullscreenchange',onfschange);
        document.addEventListener('webkitfullscreenchange',onfschange);
        document.addEventListener('mozfullscreenchange',onfschange);

        addEventListener('message',function(e) {
            if(e.data.type==='pakku_event_danmaku_loaded') {
                reload_ui(window.aid);
            }
        });
    }

    if(window.aid) {
        let cssobj=document.createElement('style');
        cssobj.textContent=CSSTEXT;
        document.head.appendChild(cssobj);
        document.body.appendChild(list_root);
        document.body.appendChild(popover);
        setup_listener();
        reload_ui(window.aid);
    }
})();