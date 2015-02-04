bandCampRevolution = function(difficulty) {
    difficulty = difficulty !== 'undefined' ? difficulty : 1;

    var spawnThreshold;
    var maxHoldMultiplier;
    var restartDelay;
    if (difficulty == 0) {
        spawnThreshold = 30000;
        maxHoldMultiplier = Math.pow(2, 20);
        restartDelay = 2200;
    }
    if (difficulty == 1) {
        spawnThreshold = 24000;
        maxHoldMultiplier = Math.pow(2, 20);
        restartDelay = 1800;
    }
    if (difficulty == 2) {
        spawnThreshold = 20000;
        maxHoldMultiplier = Math.pow(2, 16);
        restartDelay = 1400;
    }
    if (difficulty == 3) {
        spawnThreshold = 16000;
        maxHoldMultiplier = Math.pow(2, 8);
        restartDelay = 1000;
    }

    var minThreshold = spawnThreshold/20;
    var speed = distance/(restartDelay/1000*fps);

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
    var size = 200;

    var initialTimers = [-100,-100,-100,-100]
    var reverseSpawnTimer = initialTimers.slice(0);
    var arrowChars = ["☜", "☟", "☝", "☞"];
    var keyCodes = [37, 40, 38, 39];
    var fps = 240;
    var actualFps = 120;
    var resettingGame = false;
    var score = 0;
    var scoreError = 75; //How much error there is on timing the button presses.
    var previousFrameTime = null;
    var gameLoopTimeout = null;
    
    var paused = false;
    var processOrders = [
        [1, 0, 3, 2],
        [2, 3, 0, 1]
    ];
    var currentProcessOrder = 0;
    var holdMultiplier = 1;

    //Audio elements
    a = null;
    b = null;

    //Game Elements
    var scoreElem = null;
    var cover = null;
    var instructions = null;
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
        instructions.style.color = c;
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
        
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        paused = false;
        loop();
    }

    function analyseAudio() {
        analyser.getByteFrequencyData(frequencyData);
            
        for (var i = 0; i < 4; i++) {
            previousValues[i] = currentValues[i];
        }

        for (var i = 0; i < 4; i++) {
            rawValues[i] = sumArray(frequencyData, i*size, (i+1)*size);
            averages[i] = 9/10*averages[i] + 1/10*rawValues[i];
            currentValues[i] = rawValues[i] - averages[i];
        }

        for (var i = 0; i < 4; i++) {
            delta[i] = currentValues[i] - previousValues[i];
        }
    }

    function spawnArrows() {
        var spawnCount = 0;
        currentProcessOrder = (currentProcessOrder + 1) % 2;
        for (var x = 0; x < 4; x++) {
            var i = processOrders[currentProcessOrder][x];

            if (reverseSpawnTimer[i] < 1) {
                reverseSpawnTimer[i]++;
                continue;
            }

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
        } else if (holdMultiplier > 1) {
            holdMultiplier/=2;
        }
    }

    function loop() {
        gameLoopTimeout = setTimeout(function() {
            if (resettingGame) {
                resetGame();
                return;
            }

            requestAnimationFrame(loop);

            if (previousFrameTime) {
                actualFps = 1000/((new Date()) - previousFrameTime);
                actualFps = actualFps > fps ? fps : actualFps;
            }
            previousFrameTime = new Date();

            restartDelay = (b.currentTime - a.currentTime) * 1000;

            if (!paused) {
                analyseAudio();
                moveArrows();
                spawnArrows();
            }

        }, 1000/fps);
    }

    function resetGame() {
        reverseSpawnTimer = initialTimers.slice(0);
        score = 0;
        scoreElem.innerHTML = score;
    
        b.pause();
        audioSrc.disconnect();
        frequencyData = null;
        audioSrc = null;
        analyser = null
        ctx = null;
        b = null;

        clearTimeout(gameLoopTimeout);

        previousValues = [0,0,0,0];
        currentValues = [0,0,0,0];
        rawValues = [0,0,0,0];
        delta = [0,0,0,0];
        averages = [0, 0, 0, 0];
        currentProcessOrder = 0;
        holdMultiplier = 1;

        for (var i = 0; i < arrows.length; i++) {
            document.body.removeChild(arrows[i]);
        }
        arrows = [];
        setTimeout(pauseA, 4);
        resettingGame = false;
    }

    function keyDownHandler(e) {
        if (e.keyCode == 32) {
            pauseUnpauseGame();
            e.preventDefault();
            return;
        }

        if (e.keyCode == 27) { //ESC
            document.body.removeChild(cover);
            document.body.removeChild(instructions);
            document.body.removeChild(scoreElem);
            clearTimeout(gameLoopTimeout);
            for (var i = 0; i < scoreArrows.length; i++) {
                document.body.removeChild(scoreArrows[i]);
            }
            for (var i = 0; i < arrows.length; i++) {
                document.body.removeChild(arrows[i]);
            }
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
            return;
        }

        if (e.keyCode == 13) { //Enter
            resettingGame = true;
            return;
        }

        if (!paused) {
            for (var i = 0; i < 4; i++) {
                if (e.keyCode == keyCodes[i]) {
                    e.preventDefault();

                    scoreArrows[i].style.textShadow = "0px 0px 5px #FFF";
                    scoreArrows[i].style.fontSize = "110px";
                    scoreArrows[i].style.margin = "-5px 0px 0px -5px";

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

    function keyUpHandler(e) {
        if (e.keyCode == 32) {
            e.preventDefault();
        }

        if (!paused) {
            for (var i = 0; i < 4; i++) {
                if (e.keyCode == keyCodes[i]) {
                    e.preventDefault();
                    scoreArrows[i].style.textShadow = "";
                    scoreArrows[i].style.fontSize = "100px";
                    scoreArrows[i].style.margin = "0px 0px 0px 0px";
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
            height: "100%", opacity: .7, top: "0px",
            backgroundColor: "#000000"
        });

        instructions = createElement('div', {
            innerHTML: "Control with Arrow Keys</br>Space to pause.</br>Enter to restart</br>Esc to quit.</br>"
        }, {
            position: "absolute", top: "75px", left: "75px",
            fontSize: "20px", fontFamily: "Lucida Console"
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
