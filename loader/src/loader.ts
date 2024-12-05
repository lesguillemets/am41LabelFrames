const LABEL_COLOURS = ["#ffffff", "#7022ba", "#f0bd30", "#de4a18"];
const LABEL_CLASSES = [
	".color-noaction",
	".color-action",
	".color-hyperaction1",
	".color-hyperaction2",
];

function init() {
	addColor();
	prepareLoadingVideo();
	prepareCanvasClick();
}

function prepareCanvasClick() {
	const curTimeCanv: HTMLCanvasElement = document.getElementById(
		"play-loc-canv",
	)! as HTMLCanvasElement;

	function setCurrentTimeByMouse(e: MouseEvent | DragEvent) {
		const boundX = curTimeCanv.getBoundingClientRect().left;
		const x = e.clientX - boundX;
		const displayFullWidth = curTimeCanv.getBoundingClientRect().width;
		console.log(e);
		const video: HTMLMediaElement = document.getElementById(
			"the-video",
		)! as HTMLMediaElement;
		video.currentTime = (video.duration * x) / displayFullWidth;
		drawCurrentPosition(curTimeCanv, video);
	}
	let dragging = false;
	function handleDrag(e: MouseEvent) {
		if (dragging) {
			setCurrentTimeByMouse(e);
		}
	}
	curTimeCanv.addEventListener("mousedown", (e) => {
		dragging = true;
		setCurrentTimeByMouse(e);
		curTimeCanv.addEventListener("mousemove", handleDrag);
	});
	curTimeCanv.addEventListener("mouseleave", (e) => {
		dragging = false;
		curTimeCanv.removeEventListener("mousemove", handleDrag);
	});
	window.addEventListener("mouseup", (e) => {
		console.log(e);
		dragging = false;
		curTimeCanv.removeEventListener("mousemove", handleDrag);
	});
	// drag event is something different?
}

function addColor() {
	const css: CSSStyleSheet = new CSSStyleSheet();
	// 無動はラベルなしで白で表示してるから，見本的には黒□でOK
	for (let i = 1; i < LABEL_COLOURS.length; i++) {
		css.insertRule(`${LABEL_CLASSES[i]} { color: ${LABEL_COLOURS[i]};}`);
	}
	document.adoptedStyleSheets = [css];
}

function prepareLoadingVideo() {
	const vinput: HTMLInputElement = document.getElementById(
		"vfile",
	)! as HTMLInputElement;
	const vsource: HTMLSourceElement = document.getElementById(
		"the-video",
	)! as HTMLSourceElement;
	let loaded = false;
	// redraw background after loading video
	vinput.addEventListener("change", (e) => {
		console.log(`loading video: ${e}`);
		if (!loaded && vinput.files !== null) {
			const vf: File = vinput.files![0];
			vsource.src = URL.createObjectURL(vf);
			document
				.getElementById("the-video")!
				.addEventListener("loadedmetadata", () => {
					drawPlayerBackGround();
				});
			loaded = true;
		} else if (loaded) {
			alert("すみませんがファイルを変えるときは全体リロードしてください");
		} else {
			console.log("not yet loaded and input is null");
		}
	});

	// redraw background after loading label files
	const lfInput: HTMLInputElement = document.getElementById(
		"label-files",
	)! as HTMLInputElement;
	lfInput.addEventListener("change", (e) => {
		drawPlayerBackGround();
	});
	// draw current time wheneevr the video is played

	const video: HTMLMediaElement = document.getElementById(
		"the-video",
	)! as HTMLMediaElement;
	const curTimeCanv: HTMLCanvasElement = document.getElementById(
		"play-loc-canv",
	)! as HTMLCanvasElement;

	video.addEventListener("timeupdate", (e) =>
		drawCurrentPosition(curTimeCanv, video),
	);
}

function drawCurrentPosition(c: HTMLCanvasElement, v: HTMLMediaElement) {
	const currentRatio: number = v.currentTime / v.duration;
	const ctx: CanvasRenderingContext2D = c.getContext("2d")!;
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.beginPath();
	const backup = { ss: ctx.strokeStyle, lw: ctx.lineWidth };
	ctx.strokeStyle = "green";
	ctx.lineWidth = 3;
	ctx.moveTo(currentRatio * c.width, 0);
	ctx.lineTo(currentRatio * c.width, c.height);
	ctx.closePath();
	ctx.stroke();
	ctx.strokeStyle = backup.ss;
	ctx.lineWidth = backup.lw;
}

function drawPlayerBackGround() {
	const rightPane: HTMLElement = document.getElementById(
		"rightpane",
	)! as HTMLElement;
	rightPane.innerHTML = "";
	function rightLogAddLine(s: string) {
		rightPane.innerText += `\n${s}`;
	}
	// getting relevant elements
	// video
	const video: HTMLMediaElement = document.getElementById(
		"the-video",
	)! as HTMLMediaElement;

	// canvas to draw on
	const canv: HTMLCanvasElement = document.getElementById(
		"label-canv",
	)! as HTMLCanvasElement;
	const canvHeight: number = canv.height;
	const canvWidth: number = canv.width;

	// input
	const lfInput: HTMLInputElement = document.getElementById(
		"label-files",
	)! as HTMLInputElement;
	const labelFiles: FileList = lfInput.files!;
	console.log(labelFiles);
	const nFiles: number = labelFiles.length;
	const barHeight: number = canvHeight / nFiles;
	for (let i = 0; i < nFiles; i++) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const contentStr: string = e.target!.result! as string;
			const labels: Labels = parseLabelFile(contentStr);
			drawLabels(canv, labels, barHeight, i);
			console.log(`drawing ${labelFiles[i].name}`);
			// ここで共用の array に push しようとするとうまくいかない
			// wait しないとだめ？
			// labelling.push(labels);
		};
		reader.readAsText(labelFiles[i]);
		rightLogAddLine(labelFiles[i].name);
	}
}

class SingleLabel {
	start: number;
	end: number;
	label: number;

	constructor(s: number, e: number, l: number) {
		this.start = s;
		this.end = e;
		this.label = l;
	}
}

class Labels {
	dat: Array<SingleLabel> = [];
}

function parseLabelFile(s: string): Labels {
	const ls = new Labels();
	const lines = s.split("\n"); // todo: \r?
	for (let i = 1; i < lines.length; i++) {
		const ln = lines[i].split(",");
		const lb = new SingleLabel(
			Number.parseFloat(ln[0]),
			Number.parseFloat(ln[1]),
			Number.parseInt(ln[2]),
		);
		if (
			!Number.isNaN(lb.start) &&
			!Number.isNaN(lb.end) &&
			!Number.isNaN(lb.label)
		) {
			ls.dat.push(lb);
		} else {
			console.log("ERROR: NaN is found while parsing");
			console.log(lb);
			console.log(s);
		}
	}
	return ls;
}

function drawLabels(
	canv: HTMLCanvasElement,
	labels: Labels,
	barHeight: number,
	i: number,
) {
	// last second on the labelling
	const maxSecond: number = labels.dat[labels.dat.length - 1].end;
	const top: number = barHeight * i;
	const wdt: number = canv.width / maxSecond;
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
	const styleBackup = ctx.fillStyle;
	// draw the labels stored in labelFile on canv,
	// with barHeight and considering i-th labelling
	for (const label of labels.dat) {
		ctx.fillStyle = LABEL_COLOURS[label.label];
		ctx.fillRect(
			wdt * label.start,
			top,
			wdt * (label.end - label.start),
			barHeight,
		);
	}
	console.log(labels);

	ctx.fillStyle = styleBackup;
}

window.addEventListener("load", init);
