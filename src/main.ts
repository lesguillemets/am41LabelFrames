function init() {
	// 基本的に最後に押したキーだけ考えるので，それだけ覚えとくようにする
	// …と思ったけど，video を動かすためのカーソルは無視したいな
	// let lastPressedKey: string = "";
	const pressedKeys: Set<string> = new Set([]);
	const canv: HTMLCanvasElement = document.getElementById(
		"record-canv",
	)! as HTMLCanvasElement;
	const canvHeight: number = canv.height;
	const canvWidth: number = canv.width;
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
	canvInit(canv);
	window.addEventListener("keydown", (e) => {
		pressedKeys.add(e.key);
		// console.log(lastPressedKey);
	});
	window.addEventListener("keyup", (e) => {
		pressedKeys.delete(e.key);
		// console.log(lastPressedKey);
	});
	console.log("initialised");
}

function canvInit(canv: HTMLCanvasElement) {
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

window.addEventListener("load", init);
