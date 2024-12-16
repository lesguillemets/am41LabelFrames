const INTERNAL_FPS = 60;

const LABEL_COLOURS = ["#ffffff", "#7022ba", "#f0bd30", "#de4a18"];

const LOOPFPS = 30;

function init() {
	const logs: string[] = new Array();
	const vinput: HTMLInputElement = document.getElementById(
		"vfile",
	)! as HTMLInputElement;
	const vsource: HTMLSourceElement = document.getElementById(
		"the-video",
	)! as HTMLSourceElement;
	let loaded = false;
	vinput.addEventListener("change", (e) => {
		console.log("!!!");
		const lCanv: HTMLCanvasElement = document.getElementById(
			"label-canv",
		)! as HTMLCanvasElement;
		const pCanv: HTMLCanvasElement = document.getElementById(
			"play-loc-canv",
		)! as HTMLCanvasElement;
		// 先保存を登録しておく

		if (!loaded && vinput.files !== null) {
			const vf: File = vinput.files![0];
			vsource.src = URL.createObjectURL(vf);
			document
				.getElementById("the-video")!
				.addEventListener("loadedmetadata", () => {
					const video: HTMLMediaElement = document.getElementById(
						"the-video",
					)! as HTMLMediaElement;
					console.log(video.duration);
					const w: World = new World(lCanv, pCanv, video);
					initLabeller(w);
				});
			loaded = true;
		} else if (loaded) {
			alert("すみませんがファイルを変えるときは全体リロードしてください");
		} else {
			console.log("not yet loaded and input is null");
		}
	});
}

class World {
	// remember currently-pressed keys
	pressedKeys: Set<string>;
	labelCanv: HTMLCanvasElement;
	labelCanvCtx: CanvasRenderingContext2D;
	playLocCanv: HTMLCanvasElement;
	playLocCanvCtx: CanvasRenderingContext2D;
	canvHeight: number;
	canvWidth: number;
	video: HTMLMediaElement;
	labels: Array<number>;

	constructor(
		labelCanv: HTMLCanvasElement,
		playLocCanv: HTMLCanvasElement,
		video: HTMLMediaElement,
	) {
		this.pressedKeys = new Set([]);
		this.labelCanv = labelCanv;
		this.labelCanvCtx = labelCanv.getContext("2d")!;
		this.playLocCanv = playLocCanv;
		this.playLocCanvCtx = playLocCanv.getContext("2d")!;
		this.canvHeight = labelCanv.height;
		this.canvWidth = labelCanv.width;
		this.video = video;
		// prepare saving labels
		// for now, we create an array, which has INTERNAL_FPS items
		// per second.
		const labels: Array<number> = new Array(
			Math.ceil(video.duration * INTERNAL_FPS),
		);
		for (let i = 0; i < labels.length; i++) {
			labels[i] = 0;
		}
		this.labels = labels;
	}

	canvInit() {
		canvInit(this.labelCanv);
		canvInit(this.playLocCanv);
	}
	// helper functions, which might well be split elsewhere
	timeTobarX(t: number): number {
		// t: video.currentTime, so in seconds
		// returns: where on the bar does this point corresponds to?
		const currentRatio: number = t / this.video.duration;
		return this.canvWidth * currentRatio;
	}

	timeToArrayIndex(t: number): number {
		// t: video.currentTime, so in seconds
		// returns: where on the array labels this time corresponds to?
		const currentFrame: number = Math.floor(t * INTERNAL_FPS);
		return currentFrame;
	}

	drawCurrentLabels() {
		drawCurrentLabels(this.labelCanv, this.labels);
	}

	drawCurrentTime() {
		drawCurrentTime(this.playLocCanv, this.video);
	}
}

function initLabeller(w: World) {
	// logging
	function logWrite(s: any) {
		console.log(s);
	}

	// prepare listeners
	window.addEventListener("keydown", (e) => {
		w.pressedKeys.add(e.key);
	});
	window.addEventListener("keyup", (e) => {
		w.pressedKeys.delete(e.key);
	});
	w.video.addEventListener("seeking", (e) => {
		// ポーズ中は新たなラベルはつけないけど，
		// seek してる間だけ現在時刻の表示だけ更新しておく
		// seeking event は頻発するようなので，これについては
		// 自前の loop は作らないことにする
		w.drawCurrentTime();
	});
	const theButton = document.getElementById("save-button")!;
	theButton.addEventListener("click", (e) => {
		saveLabels(w.labels);
	});

	// prepare canvases
	w.canvInit();

	let curVideoTime = 0;

	// update everything on video.timeupdate ---
	// this limits our fps to, roughly 3fps in my environment,
	// which is probably unsatisfactory.
	let prevWorldTime: number = Date.now();
	function mainLoop(w: World) {
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
		const newVideoTime: number = w.video.currentTime;
		const labelBarHeadY = w.canvHeight / 2 - 1;
		let pressed: number | null = null;
		for (let i = 0; i < 4; i++) {
			if (w.pressedKeys.has(i.toString())) {
				// console.log(`pressed ${i}`);
				pressed = i;
			}
		}
		// if any of the key 0...4  is pressed;
		if (pressed !== null) {
			const lab: number = pressed!;
			// save on array
			for (
				let i = w.timeToArrayIndex(curVideoTime);
				i < w.timeToArrayIndex(newVideoTime);
				i++
			) {
				w.labels[i] = lab;
			}
			// draw bar
			w.drawCurrentLabels();
		}
		curVideoTime = newVideoTime;

		// draw (in canvas) current playing time
		w.drawCurrentTime();

		if (!w.video.paused) {
			// currently playing!
			setTimeout(() => {
				mainLoop(w);
			}, 1000.0 / LOOPFPS);
		} else {
			function waitStart(e: Event) {
				// 次再生されるまで待って，またmainLoopを回す
				curVideoTime = w.video.currentTime;
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
