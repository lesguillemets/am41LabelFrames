"use strict";
const INTERNAL_FPS = 60;
const LABEL_COLOURS = ["#ffffff", "#7022ba", "#f0bd30", "#de4a18"];
function init() {
    // logging
    const rightMemo = document.getElementById("right-memo");
    function rightLogSet(s) {
        rightMemo.innerText = s;
    }
    function rightLogAddLine(s) {
        rightMemo.innerText += `\n${s}`;
    }
    // 基本的に最後に押したキーだけ考えるので，それだけ覚えとくようにする
    // …と思ったけど，video を動かすためのカーソルは無視したいな
    // let lastPressedKey: string = "";
    // remember currently-pressed keys
    const pressedKeys = new Set([]);
    window.addEventListener("keydown", (e) => {
        pressedKeys.add(e.key);
        // console.log(lastPressedKey);
    });
    window.addEventListener("keyup", (e) => {
        pressedKeys.delete(e.key);
        // console.log(lastPressedKey);
    });
    // prepare canvases
    const canv = document.getElementById("record-canv");
    const canvHeight = canv.height;
    const canvWidth = canv.width;
    const ctx = canv.getContext("2d");
    canvInit(canv);
    // handle videos
    const video = document.getElementById("the-video");
    console.log(video.duration);
    // prepare saving labels
    // for now, we create an array, which has INTERNAL_FPS items
    // per second.
    const labels = new Array(Math.ceil(video.duration * INTERNAL_FPS));
    for (let i = 0; i < labels.length; i++) {
        labels[i] = 0;
    }
    let curVideoTime = 0;
    // helper functions, which might well be split elsewhere
    function timeTobarX(t) {
        // t: video.currentTime, so in seconds
        // returns: where on the bar does this point corresponds to?
        const currentRatio = t / video.duration;
        return (canv.width * currentRatio);
    }
    function timeToArrayIndex(t) {
        // t: video.currentTime, so in seconds
        // returns: where on the array labels this time corresponds to?
        const currentFrame = Math.floor(t * INTERNAL_FPS);
        return currentFrame;
    }
    // update everything on video.timeupdate ---
    // this limits our fps to, roughly 3fps in my environment,
    // which is probably unsatisfactory.
    let prevWorldTime = Date.now();
    video.addEventListener("timeupdate", (e) => {
        // console.log(e);
        // draw current status and fps
        rightLogSet(`${video.currentTime} / ${video.duration}`);
        const curWorldTime = Date.now();
        rightLogAddLine(`${curWorldTime - prevWorldTime}ms from last update`);
        const fps = (1000 / (curWorldTime - prevWorldTime)).toFixed(3);
        rightLogAddLine(`${fps}fps`);
        prevWorldTime = curWorldTime;
        // update labels
        const newVideoTime = video.currentTime;
        const labelBarHeadY = canv.height / 2 - 1;
        let pressed = null;
        for (let i = 0; i < 4; i++) {
            if (pressedKeys.has(i.toString())) {
                // console.log(`pressed ${i}`);
                pressed = i;
            }
        }
        // if any of the key 0...4  is pressed;
        if (pressed !== null) {
            // draw bar
            const lab = pressed;
            const bkstyle = ctx.fillStyle;
            ctx.fillStyle = LABEL_COLOURS[lab];
            ctx.fillRect(timeTobarX(curVideoTime), 0, timeTobarX(newVideoTime) - timeTobarX(curVideoTime), labelBarHeadY);
            ctx.fillStyle = bkstyle;
            // save on array
            for (let i = timeToArrayIndex(curVideoTime); i < timeToArrayIndex(newVideoTime); i++) {
                labels[i] = lab;
            }
        }
        curVideoTime = newVideoTime;
        // draw (in canvas) current playing time
        drawCurrentTime(canv, video);
    });
    const theButton = document.getElementById("save-button");
    theButton.addEventListener("click", (e) => {
        saveLabels(labels);
    });
    console.log("initialised");
    rightLogSet("Ready");
}
function saveLabels(labels) {
    const result = ["start,end,label"];
    let current = labels[0];
    let lastIndex = 0;
    for (let i = 0; i < labels.length; i++) {
        if (labels[i] === current) {
            continue;
        }
        // now new label!
        result.push([(lastIndex / INTERNAL_FPS).toFixed(2), (i / INTERNAL_FPS).toFixed(2), current].join(','));
        current = labels[i];
        lastIndex = i;
    }
    result.push([(lastIndex / INTERNAL_FPS).toFixed(2),
        (labels.length / INTERNAL_FPS).toFixed(2),
        current].join(','));
    const blob = new Blob([result.join('\n')], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anch = document.createElement('a');
    anch.setAttribute('href', url);
    anch.setAttribute('download', "label-data.csv");
    anch.style.display = 'none';
    document.body.appendChild(anch);
    anch.click();
    document.body.removeChild(anch);
    console.log(result);
}
function canvInit(canv) {
    // clears the canvas and draws horizontal line
    const ctx = canv.getContext("2d");
    const w = canv.width;
    const h = canv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.closePath();
    ctx.stroke();
}
function drawCurrentTime(canv, v) {
    const currentRatio = v.currentTime / v.duration;
    const xInCanv = canv.width * currentRatio;
    const ctx = canv.getContext("2d");
    const currentFillStyle = ctx.fillStyle;
    const triHeadY = canv.height / 2 + 1;
    ctx.clearRect(0, triHeadY, canv.width, canv.height - triHeadY); // clear bottom half
    ctx.beginPath();
    ctx.fillStyle = "#707070";
    ctx.moveTo(xInCanv, triHeadY);
    ctx.lineTo(xInCanv - 10, triHeadY + 30);
    ctx.lineTo(xInCanv + 10, triHeadY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = currentFillStyle;
}
window.addEventListener("load", init);
