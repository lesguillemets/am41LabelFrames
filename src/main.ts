function init() {
	// logging
	const rightMemo: HTMLElement = document.getElementById(
		"right-memo",
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
		"record-canv",
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
	video.addEventListener("timeupdate", (e) => {
		rightLogSet(`${video.currentTime} / ${video.duration}`);
		drawCurrentTime(canv, video);
	});

	console.log("initialised");
	rightLogSet("Ready");
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
