const LABEL_COLOURS = ["#ffffff", "#7022ba", "#f0bd30", "#de4a18"];

function init() {
	prepareLoadingVideo();
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
}

function drawPlayerBackGround() {
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
			// ここで共用の array に push しようとするとうまくいかない
			// wait しないとだめ？
			// labelling.push(labels);
		};
		reader.readAsText(labelFiles[i]);
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
		ls.dat.push(lb);
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
	const maxSecond : number = labels.dat[labels.dat.length-1].end;
	const bottom: number = canv.height - barHeight*(i+1);
	const wdt: number = canv.width / maxSecond;
	const ctx: CanvasRenderingContext2D = canv.getContext("2d")!;
	const styleBackup = ctx.fillStyle;
	// draw the labels stored in labelFile on canv,
	// with barHeight and considering i-th labelling
	for (const label of labels.dat) {
	console.log(wdt, label);
		ctx.fillStyle = LABEL_COLOURS[label.label];
		ctx.fillRect(
			wdt * label.start,
			bottom,
			wdt * (label.end - label.start),
			barHeight
		);
	}
	console.log(labels);

	ctx.fillStyle = styleBackup;
}

window.addEventListener("load", init);
