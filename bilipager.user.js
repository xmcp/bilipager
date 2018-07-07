// ==UserScript==
// @name         bilipager
// @namespace    http://s.xmcp.ml/
// @version      0.1
// @description  人类能用的B站分P列表
// @author       xmcp
// @match        *://www.bilibili.com/video/*
// @grant        none
// ==/UserScript==

const ZINDEX_NORMAL=999;
const ZINDEX_FULLSCREEN=2147483647;
const WIDTH=300;
const CSSTEXT=`
.bilipager-list:empty, .bilipager-popover:empty {
    display: none;
}

.bilipager-list {
    width: ${WIDTH}px;
    position: fixed;
    height: 100%;
    background-color: rgba(205,205,205,.9);
    top: 0;
    left: -${WIDTH-1}px;
    opacity: 0;
    z-index: ${ZINDEX_FULLSCREEN};
    box-sizing: border-box;
    padding: 2em 0;
    overflow-y: auto;
    word-break: break-all;
    transition: left .2s;
}
.bilipager-list:hover {
    left: 0;
    opacity: 1;
}

.bilipager-list p {
    line-height: 2em;
    overflow: hidden;
    padding-left: .5em;
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
    background-color: rgba(255,255,255,.9);
    white-space: normal;
}

.bilipager-list p.bilipager-curp {
    background-color: black;
    color: white;
}

.bilipager-popover {
    width: ${WIDTH-70}px;
    position: absolute;
    height: 1.7em;
    line-height: 1.7em;
    font-size: 1.2em;
    padding-left: .5em;
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
    left: -5px;
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
        list_root.textContent='';
        popover.textContent='';

        playlist_cache[aid].then(function(plist) {
            console.log('!!',plist);
            if(plist.data.length<=1) return;

            const cur=window.player.getPlaylistIndex()+1;
            popover.textContent=`[${cur}/${plist.data.length}] ${plist.data[cur-1].part}`
            plist.data.forEach(function(p) {
                let li=document.createElement('p');
                let li_1=document.createElement('code');
                li_1.textContent=`[${p.page}] ${format_duration(p.duration)} `;
                li.appendChild(li_1);
                let li_2=document.createElement('span');
                li_2.textContent=`${p.part}`;
                li.appendChild(li_2);
                li.addEventListener('click',function() {
                    location.href='//www.bilibili.com/video/av'+window.aid+'/?p='+p.page;
                });
                list_root.appendChild(li);
                if(p.page===cur) {
                    li.className='bilipager-curp';
                    li.scrollIntoViewIfNeeded();
                }
            });
        });
    }

    function setup_listener() {
        document.addEventListener('webkitfullscreenchange',function(e) {
            const elem=document.fullscreenElement||document.webkitFullscreenElement||document.body;
            if(list_root.parentNode!==elem) {
                list_root.parentNode.removeChild(list_root);
                elem.appendChild(list_root);
            }
        });

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