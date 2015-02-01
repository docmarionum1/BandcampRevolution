bandCampRevolution = function(restartDelay, respawnConstant) {
	restartDelay = typeof restartDelay !== 'undefined' ?  restartDelay : 1400;
	respawnConstant = typeof respawnConstant !== 'undefined' ? respawnConstant : 110000;
	
	var loaded = false;
	var first = true;
	var m = document.getElementsByClassName('middleColumn')[0];
	var arrows = [];
	var scoreArrows = [];
	var scoreArrowColor = "#FFFFFF";
	var previousValues = [0,0,0,0];
	var currentValues = [0,0,0,0];
	var delta = [0,0,0,0];
	var spawnTimer = [0,100,0,100];
	var arrowChars = ["☜", "☟", "☞", "☝"];
	var keyCodes = [37, 40, 39, 38];
	var arrowX = [0, 125, 250, 375];
	var xOffset = (screen.width - 500)/2;
	var processOrder = [0, 2, 1, 3];
	var scoreArrowTop = 150;
	var fps = 60;
	var yStart = screen.height;
	var distance = yStart - scoreArrowTop;
	var speed = distance/(restartDelay/1000*fps);
	var score = 0;
	var scoreElem = null;

	function restartA() {
		a.currentTime = 0;
		a.play();
	}

	function sumArray(a, i, j) {
		var s = 0;
		for (var x = i; x < j; x++) {
			s += a[x];
		}
		return s;
	}

	function moveArrows() {
		for (var i = 0; i < arrows.length; i++) {
			arrows[i].style.top = (parseInt(arrows[i].style.top) - speed) + "px";
			
			if (parseInt(arrows[i].style.top) < -100) {
				document.body.removeChild(arrows[i]);
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
		
		if (scoreArrowColor == "#FFFFFF") {
			scoreArrowColor = "#000000";
		} else {
			scoreArrowColor = "#FFFFFF";
		}
		
		for (var i = 0; i < scoreArrows.length; i++) {
			scoreArrows[i].style.color = c;
		}
		
		scoreElem.style.color = c;
	}

	function pauseA() {
		a.pause();
		b = a.cloneNode();
		loaded = true;
		b.currentTime = 0;
		b.volume = 1;
		b.play();
		console.log(a.paused, b.paused);
		setTimeout(restartA, restartDelay);
		
		var ctx = new AudioContext();
		var audioSrc = ctx.createMediaElementSource(b);
		var analyser = ctx.createAnalyser();
		
		audioSrc.connect(analyser);
		
		var frequencyData = new Uint8Array(analyser.frequencyBinCount);
		
		function renderFrame() {
			setTimeout(function() {
				requestAnimationFrame(renderFrame);
				analyser.getByteFrequencyData(frequencyData);
				if (first) {
					first = false;
					console.log(frequencyData);
				}
				
				for (var i = 0; i < 4; i++) {
					previousValues[i] = currentValues[i];
				}
				
				currentValues[0] = sumArray(frequencyData, 0, 200);
				currentValues[1] = sumArray(frequencyData, 200, 400);
				currentValues[2] = sumArray(frequencyData, 400, 600);
				currentValues[3] = sumArray(frequencyData, 600, 800);
				
				for (var i = 0; i < 4; i++) {
					delta[i] = currentValues[i] - previousValues[i];
				}
				
				for (var i = 0; i < 4; i++) {
					if (spawnTimer[i] == 0 && delta[i] > 1000) {
						var arrow = document.createElement('div');
						arrow.innerHTML = arrowChars[i];
						arrow.style.fontSize = "100px";
						arrow.style.position = "absolute";
						arrow.style.top = yStart + "px";
						arrow.style.left = xOffset + arrowX[i] + "px";
						arrow.keyCode = keyCodes[i];
						arrow.style.zIndex = 10;
						document.body.appendChild(arrow);
						arrows.push(arrow);
						spawnTimer[i] = parseInt(respawnConstant/delta[i]);
					} else if (spawnTimer[i] > 0) {
						spawnTimer[i] -= 1;
					}
				}
				
				moveArrows();
			}, 1000/fps);
		}
		
		renderFrame();
		
		document.addEventListener('keydown', function(e) {
			for (var i = 0; i < 4; i++) {
				if (e.keyCode == keyCodes[i]) {
					e.preventDefault();
					for (var j = 0; j < arrows.length; j++) {
						var d = Math.abs(scoreArrowTop - parseInt(arrows[j].style.top));
						if (arrows[j].keyCode == e.keyCode && d < 75) {
							score += (75-d)*100;
							scoreElem.innerHTML = score;
							scoreElem.style.color = "green";
							document.body.removeChild(arrows[j]);
							arrows.splice(j,1);
							return;
						}
					}
				}
			}
			score -= 5000;
			scoreElem.innerHTML = score;
			scoreElem.style.color = "red";
		});
	}

	function createScoreArrows() {
		for (var i = 0; i < 4; i++) {
			var arrow = document.createElement('div');
			arrow.innerHTML = arrowChars[i];
			arrow.style.fontSize = "100px";
			arrow.style.position = "absolute";
			arrow.style.top = scoreArrowTop + "px";
			arrow.style.left = xOffset + arrowX[i] + "px";
			arrow.style.zIndex = 10;
			document.body.appendChild(arrow);
			scoreArrows.push(arrow);
		}
	}

	function checkLoaded(){
		if (!loaded) {
			a = document.getElementsByTagName('audio')[0];
			if (a.src) {
				
				scoreElem = document.createElement('center');
				scoreElem.innerHTML = 0;
				scoreElem.style.position = "absolute";
				scoreElem.style.width = "500px";
				scoreElem.style.fontSize = "60px";
				scoreElem.style.fontFamily = "Lucida Console";
				scoreElem.style.top = scoreArrowTop - 100 + "px";
				scoreElem.style.left = xOffset + "px";
				scoreElem.style.zIndex = 10;
				document.body.appendChild(scoreElem);
				
				var cover = document.createElement('div');
				cover.style.position = "absolute";
				cover.style.width = screen.width + "px";
				cover.style.height = screen.height + "px";
				cover.style.opacity = .7;
				cover.style.top = "0px";
				cover.style.backgroundColor = "black";
				document.body.appendChild(cover);
				
				createScoreArrows();
				setInterval(changeArrowColor, 400);
				setTimeout(pauseA, 1000);
			} else {
				setTimeout(checkLoaded, 50);
			}
		}
	}
	setTimeout(checkLoaded, 50);
};