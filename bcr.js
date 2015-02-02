bandCampRevolution = function() {
    //restartDelay = typeof restartDelay !== 'undefined' ?  restartDelay : 1800;
    //respawnConstant = typeof respawnConstant !== 'undefined' ? respawnConstant : 75000;

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
    var rawValues = [0,0,0,0];
    var delta = [0,0,0,0];
    var averages = [0, 0, 0, 0];
    var averageCount = 0;

    var spawnTimer = [200,300,300,200];
    var reverseSpawnTimer = [-100,-100,-100,-100];
    var arrowChars = ["☜", "☟", "☝", "☞"];
    var keyCodes = [37, 40, 38, 39];
    var fps = 240;
    actualFps = 120;
    
    var score = 0;
    var scoreError = 75; //How much error there is on timing the button presses.
    var previousFrameTime = null;
    //var spawnThreshold = 1200;
    
    
    var paused = false;
	//var defaultSpawnTimer = respawnConstant/1500;
    var processOrders = [
        [1, 0, 3, 2],
        [2, 3, 0, 1]
    ];
    var currentProcessOrder = 0;
    var holdMultiplier = 1;

    //Audio elements
    var a = null;
    var b = null;

    //Game Elements
    var scoreElem = null;
    var cover = null;
    var scoreArrows = [];
    var arrows = [];


    var spawnThreshold;
    var maxHoldMultiplier;
    var restartDelay;

    var difficulty = 2;
    if (difficulty == 1) {
        spawnThreshold = 30000;
        maxHoldMultiplier = Math.pow(2, 24);//2526;
        restartDelay = 1800;
        //maxDelay = 20;
    }
    if (difficulty == 2) {
        spawnThreshold = 22000;
        maxHoldMultiplier = Math.pow(2, 18);//2526;
        restartDelay = 1200;
        //maxDelay = 20;
    }

    var minThreshold = spawnThreshold/20;
    var speed = distance/(restartDelay/1000*fps);


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
        //var letters = '0123456789ABCDEF'.split('');
        var letters = '789ABCDEF'.split('');
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 9)];
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
        
        rawValues[0] = sumArray(frequencyData, 0, 200);
        rawValues[1] = sumArray(frequencyData, 200, 400);
        rawValues[2] = sumArray(frequencyData, 400, 600);
        rawValues[3] = sumArray(frequencyData, 600, 800);

        averageCount++;

        for (var i = 0; i < 4; i++) {
            averages[i] = averages[i]*(averageCount-3)/averageCount + rawValues[i]/averageCount*3 ;
            currentValues[i] = rawValues[i] - averages[i];
        }

        /*currentValues[0] = sumArray(frequencyData, 0, 150);
        currentValues[1] = sumArray(frequencyData, 150, 300);
        currentValues[2] = sumArray(frequencyData, 300, 450);
        currentValues[3] = sumArray(frequencyData, 450, 600);*/

        for (var i = 0; i < 4; i++) {
            delta[i] = currentValues[i] - previousValues[i];
        }
    }

    /*function spawnArrows() {
        var spawnCount = 0;
        currentProcessOrder = (currentProcessOrder + 1) % 2;
        for (var x = 0; x < 4; x++) {
            var i = processOrders[currentProcessOrder][x];
            if ((spawnTimer[i] <= 0 && delta[i] > spawnThreshold) || (delta[i] > spawnThreshold*2 && reverseSpawnTimer[i] >= 20)) {
                arrows.push(createElement('div', {
                    innerHTML: arrowChars[i],
                    keyCode: keyCodes[i],
                    startTime: new Date()
                }, {
                    position: "absolute", fontSize: "100px", zIndex: 10,
                    top: yStart + "px", left: xOffset + arrowX[i] + "px"
                }));

				var delay = parseInt(respawnConstant/delta[i]/2);
                spawnTimer[i] = delay < defaultSpawnTimer ? delay : defaultSpawnTimer;
                reverseSpawnTimer[i] = 0;

                spawnCount++;
                if (spawnCount == 2) {
                    //If spawned 2 stop spawning and make sure no others spawn right after.
                    for (var j = 0; j < 4; j++) {
                        if (spawnTimer[j] < 10) spawnTimer[j] = 10;
                        if (reverseSpawnTimer[j] >= 10) reverseSpawnTimer[j] = 10;
                    }
                    return;
                }
            } else {
                spawnTimer[i] -= 1;
                reverseSpawnTimer[i] += 1;
            }
        }
        if (spawnCount == 1) {
            //If spawned 2 stop spawning and make sure no others spawn right after.
            for (var j = 0; j < 4; j++) {
                if (spawnTimer[j] < 10) spawnTimer[j] = 10;
                if (reverseSpawnTimer[j] >= 10) reverseSpawnTimer[j] = 10;
            }
            return;
        }
    }*/

    function spawnArrows() {
        var spawnCount = 0;
        currentProcessOrder = (currentProcessOrder + 1) % 2;
        for (var x = 0; x < 4; x++) {
            var i = processOrders[currentProcessOrder][x];

            if (reverseSpawnTimer[i] < 1) {
                reverseSpawnTimer[i]++;
                continue;
            }

            /*var threshholdMultiplier = 15/reverseSpawnTimer[i];
            if (threshholdMultiplier < .5) {
                threshholdMultiplier = .5;
            }*/
            /*if (threshholdMultiplier < 0) {
                threshholdMultiplier = 0;
            } else if (threshholdMultiplier < 1) {
                threshholdMultiplier = 1;
            }*/
            //threshholdMultiplier = threshholdMultiplier < 1 ? 1 : threshholdMultiplier;

            //if (delta[i] > spawnThreshold*threshholdMultiplier) {
            var threshold = (spawnThreshold/reverseSpawnTimer[i])*holdMultiplier*(1 + spawnCount);
            threshold = threshold < minThreshold ? minThreshold : threshold;
            if (delta[i] > threshold) {
                arrows.push(createElement('div', {
                    innerHTML: arrowChars[i],
                    keyCode: keyCodes[i],
                    startTime: new Date()
                }, {
                    position: "absolute", fontSize: "100px", zIndex: 10,
                    top: yStart + "px", left: xOffset + arrowX[i] + "px"
                }));

                reverseSpawnTimer[i] = -4;

                spawnCount++;
                if (spawnCount == 2) {
                    break;
                }

            } else {
                reverseSpawnTimer[i] += 1;
            }
        }

        if (spawnCount > 0) {
            holdMultiplier = maxHoldMultiplier;
            /*
            //If spawned 2 stop spawning and make sure no others spawn right after.
            for (var j = 0; j < 4; j++) {
                //if (reverseSpawnTimer[j] >= 0) reverseSpawnTimer[j] = -2;
                reverseSpawnTimer[j] = -3;
            }
            */
            //minThreshold += spawnCount * 7;
        } else if (holdMultiplier > 1) {
            holdMultiplier/=2;
            //minThreshold--;
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
                    for (var j = 0; j < (arrows.length < 4 ? arrows.length : 4); j++) {
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
            position: "absolute", width: "100%",
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
