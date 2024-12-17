"use strict";
const INTERNAL_FPS = 60;
const LABEL_COLOURS = ["#ffffff", "#7022ba", "#f0bd30", "#de4a18"];
const LOOPFPS = 30;
const VIDEOFPS = 29.97;
function init() {
    const logs = new Array();
    const vinput = document.getElementById("vfile");
    const vsource = document.getElementById("the-video");
    let loaded = false;
    vinput.addEventListener("change", (e) => {
        console.log("!!!");
        const lCanv = document.getElementById("label-canv");
        const pCanv = document.getElementById("play-loc-canv");
        // 先保存を登録しておく
        if (!loaded && vinput.files !== null) {
            const vf = vinput.files[0];
            vsource.src = URL.createObjectURL(vf);
            document
                .getElementById("the-video")
                .addEventListener("loadedmetadata", () => {
                const video = document.getElementById("the-video");
                console.log(video.duration);
                const w = new World(lCanv, pCanv, video);
                prepareKeyboardListeners(w);
                initLabeller(w);
                prepareCanvasClick(w);
                prepareRightControl(w);
            });
            loaded = true;
        }
        else if (loaded) {
            alert("すみませんがファイルを変えるときは全体リロードしてください");
        }
        else {
            console.log("not yet loaded and input is null");
        }
    });
}
function prepareKeyboardListeners(w) {
    // prepare listeners
    let repeatLimit = 0;
    const keyfr = { d: 1, a: -1 };
    window.addEventListener("keydown", (e) => {
        w.pressedKeys.add(e.key);
        if (keyfr[e.key] !== undefined) {
            //either d or a
            // FIXME:
            // 8回のイベントごとになんかする感じにしましょう
            w.video.pause();
            repeatLimit = (repeatLimit + 1) % 8;
            if (!e.repeat || repeatLimit === 0) {
                w.frameForward(keyfr[e.key]);
            }
        }
    });
    window.addEventListener("keyup", (e) => {
        w.pressedKeys.delete(e.key);
        if (keyfr[e.key] !== undefined) {
            repeatLimit = 0;
        }
    });
}
function prepareCanvasClick(w) {
    // 下の評定部分をクリックしてその時間に飛べるように
    function setCurrentTimeByMouse(e) {
        const boundX = w.playLocCanv.getBoundingClientRect().left;
        const x = e.clientX - boundX;
        const displayFullWidth = w.playLocCanv.getBoundingClientRect().width;
        console.log(e);
        w.video.currentTime = (w.video.duration * x) / displayFullWidth;
        w.drawCurrentTime();
    }
    let dragging = false;
    function handleDrag(e) {
        if (dragging) {
            setCurrentTimeByMouse(e);
        }
    }
    w.playLocCanv.addEventListener("mousedown", (e) => {
        dragging = true;
        setCurrentTimeByMouse(e);
        w.playLocCanv.addEventListener("mousemove", handleDrag);
    });
    w.playLocCanv.addEventListener("mouseleave", (e) => {
        dragging = false;
        w.playLocCanv.removeEventListener("mousemove", handleDrag);
    });
    // クリック→領域外→ mouseup も拾っておく
    window.addEventListener("mouseup", (e) => {
        dragging = false;
        w.playLocCanv.removeEventListener("mousemove", handleDrag);
    });
    // drag event is something different?
}
function prepareRightControl(w) {
    document
        .getElementById("control-frame-forward")
        .addEventListener("click", (e) => {
        w.video.pause();
        w.frameForward(1);
    });
    document
        .getElementById("control-frame-backward")
        .addEventListener("click", (e) => {
        w.video.pause();
        w.frameForward(-1);
    });
    document
        .getElementById("control-play-framewise")
        .addEventListener("click", (e) => {
        if (w.playMode === "normal") {
            const dte = document.getElementById("frame-play-duration");
            const dt = Number.parseInt(dte.value);
            w.startFramewisePlay(dt);
        }
        else if (w.playMode === "framewise") {
            w.endFramwisePlay();
        }
    });
}
class World {
    constructor(labelCanv, playLocCanv, video) {
        this.pressedKeys = new Set([]);
        this.labelCanv = labelCanv;
        this.labelCanvCtx = labelCanv.getContext("2d");
        this.playLocCanv = playLocCanv;
        this.playLocCanvCtx = playLocCanv.getContext("2d");
        this.canvHeight = labelCanv.height;
        this.canvWidth = labelCanv.width;
        this.video = video;
        this.lastVideoTime = 0;
        // prepare saving labels
        // for now, we create an array, which has INTERNAL_FPS items
        // per second.
        const labels = new Array(Math.ceil(video.duration * INTERNAL_FPS));
        for (let i = 0; i < labels.length; i++) {
            labels[i] = 0;
        }
        this.labels = labels;
        this.playMode = "normal";
    }
    updateLabelsByCurrentPress() {
        // lastVideoTime もここで update している
        const newVideoTime = this.video.currentTime;
        const labelBarHeadY = this.canvHeight / 2 - 1;
        let pressed = null;
        for (let i = 0; i < 4; i++) {
            if (this.pressedKeys.has(i.toString())) {
                // console.log(`pressed ${i}`);
                pressed = i;
            }
        }
        // if any of the key 0...4  is pressed;
        if (pressed !== null) {
            const lab = pressed;
            // save on array
            for (let i = this.timeToArrayIndex(this.lastVideoTime); i < this.timeToArrayIndex(newVideoTime); i++) {
                this.labels[i] = lab;
            }
            // draw bar
            this.drawCurrentLabels();
        }
        this.lastVideoTime = newVideoTime;
    }
    frameForward(fr) {
        // fr frames 進める
        // fr = -1 で frameBackward になるわけだ
        // これをやるときには video が paused な前提としておく
        if (!this.video.paused) {
            alert("unexpected situation: call to frameForward but video not paused");
            return;
        }
        this.video.currentTime += fr / VIDEOFPS;
        this.updateLabelsByCurrentPress();
    }
    startFramewisePlay(dt) {
        // dt milliseconds
        this.video.pause();
        // dt が 0 とかだと fps 以下には下げないようにする
        const t = Math.max(dt, 1000 / VIDEOFPS);
        this.playMode = "framewise";
        document.getElementById("control-current-status").innerText =
            "再生モード: コマ送り";
        document.getElementById("control-play-framewise").innerText = "⏸️";
        // FIXME: こうしないと closure にならない？
        const w = this;
        function step() {
            w.frameForward(1);
            if (w.playMode === "framewise") {
                setTimeout(() => {
                    step();
                }, t);
            }
        }
        step();
    }
    endFramwisePlay() {
        this.playMode = "normal";
        document.getElementById("control-current-status").innerText =
            "再生モード: 通常";
        document.getElementById("control-play-framewise").innerText = "▶️";
    }
    canvInit() {
        canvInit(this.labelCanv);
        canvInit(this.playLocCanv);
    }
    // helper functions, which might well be split elsewhere
    timeTobarX(t) {
        // t: video.currentTime, so in seconds
        // returns: where on the bar does this point corresponds to?
        const currentRatio = t / this.video.duration;
        return this.canvWidth * currentRatio;
    }
    timeToArrayIndex(t) {
        // t: video.currentTime, so in seconds
        // returns: where on the array labels this time corresponds to?
        const currentFrame = Math.floor(t * INTERNAL_FPS);
        return currentFrame;
    }
    drawCurrentLabels() {
        drawCurrentLabels(this.labelCanv, this.labels);
    }
    drawCurrentTime() {
        drawCurrentTime(this.playLocCanv, this.video);
    }
}
function initLabeller(w) {
    // logging
    function logWrite(s) {
        console.log(s);
    }
    w.video.addEventListener("seeking", (e) => {
        // ポーズ中は新たなラベルはつけないけど，
        // seek してる間だけ現在時刻の表示だけ更新しておく
        // seeking event は頻発するようなので，これについては
        // 自前の loop は作らないことにする
        w.drawCurrentTime();
    });
    const theButton = document.getElementById("save-button");
    theButton.addEventListener("click", (e) => {
        saveLabels(w.labels);
    });
    // prepare canvases
    w.canvInit();
    // update everything on video.timeupdate ---
    // this limits our fps to, roughly 3fps in my environment,
    // which is probably unsatisfactory.
    let prevWorldTime = Date.now();
    function mainLoop(w) {
        // draw current status and fps
        // logWrite(
        // 	`${w.video.currentTime.toFixed(3)} / ${w.video.duration.toFixed(3)}`,
        // );
        // const curWorldTime: number = Date.now();
        // logWrite(`${curWorldTime - prevWorldTime}ms from last update`);
        // const currentFps: string = (1000 / (curWorldTime - prevWorldTime)).toFixed(
        //	3,
        //);
        // logWrite(`${currentFps}fps`);
        // prevWorldTime = curWorldTime;
        // update labels
        w.updateLabelsByCurrentPress();
        // draw (in canvas) current playing time
        w.drawCurrentTime();
        if (!w.video.paused) {
            // currently playing!
            setTimeout(() => {
                mainLoop(w);
            }, 1000.0 / LOOPFPS);
        }
        else {
            function waitStart(e) {
                // 次再生されるまで待って，またmainLoopを回す
                w.lastVideoTime = w.video.currentTime;
                prevWorldTime = Date.now();
                // このとき「再生されるまで待ち」はやめる
                w.video.removeEventListener("play", waitStart);
                setTimeout(() => {
                    mainLoop(w);
                }, 1000.0 / LOOPFPS);
            }
            w.video.addEventListener("play", waitStart);
        }
    }
    console.log("initialised");
    logWrite("Ready");
    mainLoop(w);
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
        result.push([
            (lastIndex / INTERNAL_FPS).toFixed(2),
            (i / INTERNAL_FPS).toFixed(2),
            current,
        ].join(","));
        current = labels[i];
        lastIndex = i;
    }
    result.push([
        (lastIndex / INTERNAL_FPS).toFixed(2),
        (labels.length / INTERNAL_FPS).toFixed(2),
        current,
    ].join(","));
    const blob = new Blob([result.join("\n")], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anch = document.createElement("a");
    anch.setAttribute("href", url);
    anch.setAttribute("download", "label-data.csv");
    anch.style.display = "none";
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
function drawCurrentLabels(canv, labels) {
    // その時のラベル情報をまるっと描画．
    // あまり複雑になるとパフォーマンスを落とすかも．その場合は差分だけ描画とかを考える
    // 要するに，各 loop 事に愚直に描画してると，少しずつ四角に隙間ができて，
    // 同じ場所を2回評定したときにきれいに塗りつぶせないのでこちらを採用することにした
    const ctx = canv.getContext("2d");
    const bkstyle = ctx.fillStyle;
    const labelBarHeadY = canv.height / 2 - 1;
    let current = labels[0];
    let lastIndex = 0;
    for (let i = 0; i < labels.length; i++) {
        if (labels[i] === current) {
            continue;
        }
        // now new label!
        ctx.fillStyle = LABEL_COLOURS[current];
        ctx.fillRect((canv.width * lastIndex) / labels.length, 0, (canv.width * (i - lastIndex)) / labels.length, labelBarHeadY);
        current = labels[i];
        lastIndex = i;
    }
    ctx.fillStyle = bkstyle;
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
