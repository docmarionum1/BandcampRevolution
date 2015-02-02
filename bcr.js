bandCampRevolution = function(restartDelay, respawnConstant) {
	restartDelay = typeof restartDelay !== 'undefined' ?  restartDelay : 1800;
	respawnConstant = typeof respawnConstant !== 'undefined' ? respawnConstant : 130000;

	//Dimensions
	var xOffset = (screen.width - 500)/2;
	var scoreArrowTop = 150;
	var yStart = screen.height;
	var distance = yStart - scoreArrowTop;
	var arrowX = [0, 125, 250, 375];
	
	//Audio analysis 
	var ctx = null;
	var audioSrc = null;
	var analyser = null;
	var frequencyData = null;
	var previousValues = [0,0,0,0];
	var currentValues = [0,0,0,0];
	var delta = [0,0,0,0];

	var spawnTimer = [500,500,500,500];
	var arrowChars = ["☜", "☟", "☝", "☞"];
	var keyCodes = [37, 40, 38, 39];
	var fps = 60;
	var actualFps = 60;
	var speed = distance/(restartDelay/1000*fps);
	var score = 0;
	var scoreError = 75; //How much error there is on timing the button presses.
	var previousFrameTime = null;
	var spawnThreshold = 800;
	var paused = false;

	//Audio elements
	var a = null;
	var b = null;

	//Game Elements
	var scoreElem = null;
	var cover = null;
	var scoreArrows = [];
	var arrows = [];



	function restartA() {
		a.currentTime = 0;
		if (b.currentTime * 1000 >= restartDelay) {
			a.play();
			restartDelay = (b.currentTime - a.currentTime) * 1000;
		} else {
			setTimeout(restartA, 4);
			restartDelay = (b.currentTime - a.currentTime) * 1000;
		}
	}

	function sumArray(a, i, j) {
		var s = 0;
		for (var x = i; x < j; x++) {
			s += a[x];
		}
		return s;
	}

	function moveArrows() {
		speed = distance/(restartDelay/1000*actualFps);
		
		for (var i = 0; i < arrows.length; i++) {
			var arrow = arrows[i];
			var currentY = parseInt(arrow.style.top);
			var remainingDistance = currentY - scoreArrowTop;
			var remainingTime = restartDelay - ((new Date()) - arrow.startTime);
			var aspeed = remainingDistance <= 0 || remainingTime <= 0 ? speed : 1000*remainingDistance/remainingTime/actualFps;

			arrow.style.top = currentY - aspeed + "px";
			
			if (arrow.startTime && remainingDistance <= 0) {
				console.log(remainingTime);
				arrow.startTime = null;
			}
			
			if (currentY < -100) {
				document.body.removeChild(arrow);
				arrows.splice(i,1);
				score -= 10000;
				scoreElem.innerHTML = score;
				scoreElem.style.color = "red";
			}
		}
	}

	function getRandomColor() {
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}

	function changeArrowColor() {
		var c = getRandomColor();
		for (var i = 0; i < arrows.length; i++) {
			arrows[i].style.color = c;
		}
		
		for (var i = 0; i < scoreArrows.length; i++) {
			scoreArrows[i].style.color = c;
		}
		
		scoreElem.style.color = c;
	}

	function pauseA() {
		a.pause();
		b = a.cloneNode();
		b.currentTime = 0;
		b.volume = 1;
		b.play();
		setTimeout(restartA, restartDelay);
		
		ctx = new AudioContext();
		audioSrc = ctx.createMediaElementSource(b);
		analyser = ctx.createAnalyser();
		audioSrc.connect(analyser);
		
		frequencyData = new Uint8Array(analyser.frequencyBinCount);
		
		document.addEventListener('keydown', keyHandler);

		loop();
	}

	function analyseAudio() {
		analyser.getByteFrequencyData(frequencyData);
			
		for (var i = 0; i < 4; i++) {
			previousValues[i] = currentValues[i];
		}
		
		currentValues[0] = sumArray(frequencyData, 0, 200);
		currentValues[1] = sumArray(frequencyData, 200, 400);
		currentValues[2] = sumArray(frequencyData, 400, 600);
		currentValues[3] = sumArray(frequencyData, 600, 800);

		/*currentValues[0] = sumArray(frequencyData, 0, 150);
		currentValues[1] = sumArray(frequencyData, 150, 300);
		currentValues[2] = sumArray(frequencyData, 300, 450);
		currentValues[3] = sumArray(frequencyData, 450, 600);*/

		for (var i = 0; i < 4; i++) {
			delta[i] = currentValues[i] - previousValues[i];
		}
	}

	function spawnArrows() {
		for (var i = 0; i < 4; i++) {
			if (spawnTimer[i] == 0 && delta[i] > spawnThreshold) {
				arrows.push(createElement('div', {
					innerHTML: arrowChars[i],
					keyCode: keyCodes[i],
					startTime: new Date()
				}, {
					position: "absolute", fontSize: "100px", zIndex: 10,
					top: yStart + "px", left: xOffset + arrowX[i] + "px"
				}));

				spawnTimer[i] = parseInt(respawnConstant/delta[i]);
			} else if (spawnTimer[i] > 0) {
				spawnTimer[i] -= 1;
			}
		}
	}

	function loop() {
		setTimeout(function() {
			requestAnimationFrame(loop);

			if (previousFrameTime) {
				actualFps = 1000/((new Date()) - previousFrameTime);
				actualFps = actualFps > fps ? fps : actualFps;
			}
			previousFrameTime = new Date();

			if (!paused) {
				analyseAudio();
				moveArrows();
				spawnArrows();
			}

		}, 1000/fps);
	}

	function keyHandler(e) {
		if (e.keyCode == 32) {
			pauseUnpauseGame();
			e.preventDefault();
		}

		if (!paused) {
			for (var i = 0; i < 4; i++) {
				if (e.keyCode == keyCodes[i]) {
					e.preventDefault();
					for (var j = 0; j < arrows.length; j++) {
						var d = Math.abs(scoreArrowTop - parseInt(arrows[j].style.top));
						if (arrows[j].keyCode == e.keyCode && d < scoreError + speed) {
							score += (scoreError-d)*100;
							scoreElem.innerHTML = score;
							scoreElem.style.color = "green";
							document.body.removeChild(arrows[j]);
							arrows.splice(j,1);
							return;
						}
					}

					//If a key was pressed incorrectly
					score -= 5000;
					scoreElem.innerHTML = score;
					scoreElem.style.color = "red";
				}
			}
		}
	}

	function pauseUnpauseGame() {
		if (paused) {
			a.play();
			b.play();
			paused = false;
		} else {
			a.pause();
			b.pause();
			paused = true;
		}
	}

	function createScoreArrows() {
		for (var i = 0; i < 4; i++) {
			scoreArrows.push(createElement('div', {innerHTML: arrowChars[i]}, {
				position: "absolute", fontSize: "100px", zIndex: 10,
				top: scoreArrowTop + "px", left: xOffset + arrowX[i] + "px"
			}));
		}
	}

	function createElement(type, properties, style) {
		var e = document.createElement(type);

		for (var k in properties) {
			e[k] = properties[k];
		}

		for (var k in style) {
			e.style[k] = style[k];
		}

		document.body.appendChild(e);

		return e;
	}

	//Set up the game once the audio starts playing
	function setUpGame() {
		scoreElem = createElement('center', {innerHTML: 0}, {
			position: "absolute", width: "500px", fontSize: "60px",
			fontFamily: "Lucida Console", top: scoreArrowTop - 100 + "px",
			left: xOffset + "px", zIndex: 10
		});

		cover = createElement('div', {}, {
			position: "absolute", width: screen.width + "px",
			height: screen.height + "px", opacity: .7, top: "0px",
			backgroundColor: "#000000"
		});
		
		createScoreArrows();

		setInterval(changeArrowColor, 400);
		setTimeout(pauseA, 4);
	}

	function checkLoaded(){
		//if (!loaded) {
			a = document.getElementsByTagName('audio')[0];
			if (a.src) {
				setUpGame();
			} else {
				setTimeout(checkLoaded, 4);
			}
		//}
	}

	setTimeout(checkLoaded, 4);
};