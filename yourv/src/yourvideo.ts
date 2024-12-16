const INTERNAL_FPS = 60;

const LABEL_COLOURS = ["#ffffff", "#7022ba", "#f0bd30", "#de4a18"];

const LOOPFPS = 30;

function init() {
	const vinput: HTMLInputElement = document.getElementById(
		"vfile",
	)! as HTMLInputElement;
	const vsource: HTMLSourceElement = document.getElementById(
		"the-video",
	)! as HTMLSourceElement;
	let loaded = false;
	vinput.addEventListener("change", (e) => {
		console.log("!!!");
		if (!loaded && vinput.files !== null) {
			const vf: File = vinput.files![0];
			vsource.src = URL.createObjectURL(vf);
			document
				.getElementById("the-video")!
				.addEventListener("loadedmetadata", () => {
					initLabeller();
				});
			loaded = true;
		} else if (loaded) {
			alert("すみませんがファイルを変えるときは全体リロードしてください");
		} else {
			console.log("not yet loaded and input is null");
		}
	});
}

function initLabeller() {
	// logging
	const rightMemo: HTMLElement = document.getElementById(
		"right-pane",
	)! as HTMLElement;
	function rightLogSet(s: string) {
		rightMemo.innerText = s;
	}
	function rightLogAddLine(s: string) {
		rightMemo.innerText += `\n${s}`;
	}

	// 基本的に最後に押したキーだけ考えるので，それだけ覚えとくようにする
	// …と思ったけど，video を動かすためのカーソルは無視したいな
	// let lastPressedKey: string = "";
	// remember currently-pressed keys
	const pressedKeys: Set<string> = new Set([]);
	window.addEventListener("keydown", (e) => {
		pressedKeys.add(e.key);
		// console.log(lastPressedKey);
	});
	window.addEventListener("keyup", (e) => {
		pressedKeys.delete(e.key);
		// console.log(lastPressedKey);
	});

	// prepare canvases
	const canv: HTMLCanvasElement = document.getElementById(
		"label-canv",
	)! as HTMLCanvasElement;
	const canvHeight: number = canv.height;
	const canvWidth: number = canv.width;
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
	canvInit(canv);

	// handle videos
	const video: HTMLMediaElement = document.getElementById(
		"the-video",
	)! as HTMLMediaElement;
	console.log(video.duration);

	// prepare saving labels
	// for now, we create an array, which has INTERNAL_FPS items
	// per second.
	const labels: Array<number> = new Array(
		Math.ceil(video.duration * INTERNAL_FPS),
	);
	for (let i = 0; i < labels.length; i++) {
		labels[i] = 0;
	}
	let curVideoTime = 0;

	// helper functions, which might well be split elsewhere
	function timeTobarX(t: number) {
		// t: video.currentTime, so in seconds
		// returns: where on the bar does this point corresponds to?
		const currentRatio: number = t / video.duration;
		return canv.width * currentRatio;
	}
	function timeToArrayIndex(t: number) {
		// t: video.currentTime, so in seconds
		// returns: where on the array labels this time corresponds to?
		const currentFrame: number = Math.floor(t * INTERNAL_FPS);
		return currentFrame;
	}

	// update everything on video.timeupdate ---
	// this limits our fps to, roughly 3fps in my environment,
	// which is probably unsatisfactory.
	let prevWorldTime: number = Date.now();
	function mainLoop() {
		// draw current status and fps
		rightLogSet(`${video.currentTime.toFixed(3)} / ${video.duration.toFixed(3)}`);
		const curWorldTime: number = Date.now();
		rightLogAddLine(`${curWorldTime - prevWorldTime}ms from last update`);
		const fps: string = (1000 / (curWorldTime - prevWorldTime)).toFixed(3);
		rightLogAddLine(`${fps}fps`);
		prevWorldTime = curWorldTime;

		// update labels
		const newVideoTime: number = video.currentTime;
		const labelBarHeadY = canv.height / 2 - 1;
		let pressed: number | null = null;
		for (let i = 0; i < 4; i++) {
			if (pressedKeys.has(i.toString())) {
				// console.log(`pressed ${i}`);
				pressed = i;
			}
		}
		// if any of the key 0...4  is pressed;
		if (pressed !== null) {
			const lab: number = pressed!;
			// save on array
			for (
				let i = timeToArrayIndex(curVideoTime);
				i < timeToArrayIndex(newVideoTime);
				i++
			) {
				labels[i] = lab;
			}
			// draw bar
			drawCurrentLabels(canv, labels);
		}
		curVideoTime = newVideoTime;

		// draw (in canvas) current playing time
		drawCurrentTime(canv, video);

		if (!video.paused) {
			// currently playing!
			setTimeout(() => {
				mainLoop();
			}, 1000.0 / LOOPFPS);
		} else {
			function waitStart(e: Event) {
				curVideoTime = video.currentTime;
				prevWorldTime = Date.now();
				video.removeEventListener("play", waitStart);
				setTimeout(() => {
					mainLoop();
				}, 1000.0 / LOOPFPS);
			}
			video.addEventListener("play", waitStart);
		}
	}

	video.addEventListener("seeking", (e) => {
		// ポーズ中は新たなラベルはつけないけど，
		// seek してる間だけ現在時刻の表示だけ更新しておく
		// seeking event は頻発するようなので，これについては
		// 自前の loop は作らないことにする
		drawCurrentTime(canv, video);
	});

	const theButton = document.getElementById("save-button")!;
	theButton.addEventListener("click", (e) => {
		saveLabels(labels);
	});

	console.log("initialised");
	rightLogSet("Ready");
	mainLoop();
}

function saveLabels(labels: Array<number>) {
	const result = ["start,end,label"];
	let current = labels[0];
	let lastIndex = 0;
	for (let i = 0; i < labels.length; i++) {
		if (labels[i] === current) {
			continue;
		}
		// now new label!
		result.push(
			[
				(lastIndex / INTERNAL_FPS).toFixed(2),
				(i / INTERNAL_FPS).toFixed(2),
				current,
			].join(","),
		);
		current = labels[i];
		lastIndex = i;
	}
	result.push(
		[
			(lastIndex / INTERNAL_FPS).toFixed(2),
			(labels.length / INTERNAL_FPS).toFixed(2),
			current,
		].join(","),
	);
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

function canvInit(canv: HTMLCanvasElement) {
	// clears the canvas and draws horizontal line
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
	const w: number = canv.width;
	const h: number = canv.height;
	ctx.clearRect(0, 0, w, h);
	ctx.beginPath();
	ctx.moveTo(0, h / 2);
	ctx.lineTo(w, h / 2);
	ctx.closePath();
	ctx.stroke();
}

function drawCurrentLabels(canv: HTMLCanvasElement, labels: Array<number>) {
	// その時のラベル情報をまるっと描画．
	// あまり複雑になるとパフォーマンスを落とすかも．その場合は差分だけ描画とかを考える
	// 要するに，各 loop 事に愚直に描画してると，少しずつ四角に隙間ができて，
	// 同じ場所を2回評定したときにきれいに塗りつぶせないのでこちらを採用することにした
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
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
		ctx.fillRect(
			(canv.width * lastIndex) / labels.length,
			0,
			(canv.width * (i - lastIndex)) / labels.length,
			labelBarHeadY,
		);
		current = labels[i];
		lastIndex = i;
	}
	ctx.fillStyle = bkstyle;
}

function drawCurrentTime(canv: HTMLCanvasElement, v: HTMLMediaElement) {
	const currentRatio: number = v.currentTime / v.duration;
	const xInCanv: number = canv.width * currentRatio;
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
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
