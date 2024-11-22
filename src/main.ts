function init() {
	// 基本的に最後に押したキーだけ考えるので，それだけ覚えとくようにする
	// …と思ったけど，video を動かすためのカーソルは無視したいな
	// let lastPressedKey: string = "";
	const pressedKeys: Set<string> = new Set([]);
	const canv: HTMLCanvasElement = document.getElementById('record-canv')! as HTMLCanvasElement;
	const ctx: CanvasRenderingContext2D = canv.getContext('2d')!;
	window.addEventListener(
		'keydown', (e) => {
			pressedKeys.add(e.key);
			// console.log(lastPressedKey);
		}
	);
	window.addEventListener(
		'keyup', (e) => {
			pressedKeys.delete(e.key);
			// console.log(lastPressedKey);
		}
	);
	console.log('initialised');
}

window.addEventListener("load", init);
