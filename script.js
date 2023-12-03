const playButton = document.getElementById('startGameBtn');
const startGameContainer = document.getElementById('startGame');
const inGameContainer = document.getElementById('inGameContainer');
const heading = document.getElementById('heading');
const rendring_model = document.getElementById('body')
const VIDEO = document.getElementById('webcam');
let model = false;
let Lwrist;
let dots = [];
let left_wristX;
let Rwrist;
let predition;
let left_wristY;
class Position {
  prevMouseX = 0;
  prevMouseY = 0;
  mouseX = 0;
  mouseY = 0;
  linesArray = [];

  constructor(px, py, Lwrist) {
    this.prevMouseX = Lwrist?.mouseX;
    this.prevMouseY = Lwrist?.mouseY;
    this.mouseX = px;
    this.mouseY = py;
    this.linesArray.push({ x: this.mouseX, y: this.mouseY, pMouseX: this.prevMouseX, pMouseY: this.prevMouseY });
  }
}
// model data
const MODEL_PATH = 'https://raw.githubusercontent.com/mueezejaz/model/main/model_m/model.json';
let movenet = undefined;
//Importing Sound
const gameStartSound = new Audio('./Sound_Source/Game-start.wav')
const gameEndSound = new Audio('./Sound_Source/Game-over.wav')
const bombTouchSound = new Audio('./Sound_Source/gank.wav')
const timeBeepSound = new Audio('./Sound_Source/time-beep.wav')
const buttonPushSound = new Audio('./Sound_Source/ui-button-push.wav')
//creating model
// function createDot(id) {
//     const dot = document.createElement('div');
//     dot.className = 'dot';
//     dot.id = id;
//     dots.push(dot);
//     rendring_model.appendChild(dot);
//   }
// position changing function
function updateDotPosition(id, x, y, originalWidth, originalHeight, resizedWidth, resizedHeight) {
  const dot = document.getElementById(id);
  if (dot) {
    // Scale the coordinates based on the ratio between original and resized sizes
    const scaleX = window.innerWidth;
    const scaleY = originalHeight;

    // Apply the scaling to the coordinates
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    dot.style.left = scaledX + 'px';
    dot.style.top = scaledY + 'px';
  }
}
//function for loading model
async function loadAndRunModel() {
  heading.innerText = "pleas wait model is loading"
  movenet = await tf.loadGraphModel(MODEL_PATH);
  heading.innerText = "model loaded warming up"
  let exampleInputTensor = tf.zeros([1, 192, 192, 3], 'int32');
  heading.innerText = "model loaded Ready to use"
  model = true;
}
loadAndRunModel()

// nakibg prediction
async function prediction() {
  tf.tidy(() => {
    renderBalls();
    let tensorOutput = movenet.predict(tf.expandDims(resizeImage(VIDEO)));
    let arrayOutput = tensorOutput.arraySync();

    let sec = arrayOutput[0];
    left_wristX = sec[0][10][1] * window.innerWidth;
    left_wristY = sec[0][10][0] * window.innerHeight;
    let right_wristX = sec[0][9][1] * window.innerWidth;
    let right_wristY = sec[0][9][0] * window.innerHeight;
    predition = sec[0][9][3];
    Lwrist = new Position(left_wristX, left_wristY, Lwrist);
    Rwrist = new Position(right_wristX, right_wristY, Rwrist)

    renderMouseLines(Lwrist.linesArray);
    renderMouseLines(Rwrist.linesArray);
    for (let i = 0; i < sec[0].length; i++) {

      let x = sec[0][i][1]; // Scale x-coordinate
      let y = sec[0][i][0];
      // Scale y-coordinate
      createDot(x, y);
      updateDotPosition('point' + i, x, y, VIDEO.videoWidth, VIDEO.videoHeight, 192, 192);
      // position()
    }
    tensorOutput.dispose();
  });
  if (movenet) {
    window.requestAnimationFrame(prediction);
  }
}
//refactring image
function resizeImage(EXAMPLE_IMG, targetSize) {
  let imageTensor = tf.browser.fromPixels(EXAMPLE_IMG);
  imageTensor = imageTensor.reverse(1);
  let resizedTensor = tf.image.resizeBilinear(imageTensor, [192, 192], true).toInt();

  return resizedTensor;
}
//camera related functions
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
function enableCam() {
  if (hasGetUserMedia()) {
    // getUsermedia parameters.
    const constraints = {
      video: true,
      width: window.innerWidth,
      height: window.innerHeight
    };
    console.log(VIDEO)
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      VIDEO.srcObject = stream;
      VIDEO.addEventListener('loadeddata', function() {
        vid = true;
        prediction()

      });
    });
  } else {
    console.warn('getUserMedia() is not supported by your browser');
  }
}
let isSwordSoundPlaying = false;
//Sword Sound Effect
const playSwordSound = () => {
  //Generating a random audio by random number as per source sound name
  let swordAudio = new Audio(`./Sound_Source/Sword_Sound_Effects/Sword-swipe-${Math.floor(Math.random() * 6) + 1}.wav`);
  swordAudio.play();
  //Setting this true to not to play more audio before this ends.
  isSwordSoundPlaying = true;
  swordAudio.addEventListener('ended', () => {

    isSwordSoundPlaying = false;
  })

}

//Using Visibility change to prevent rendering balls when the tab is inactive
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    isGamePause = false;
  } else {
    isGamePause = true;
  }

})

//Front Home Play Button
playButton.addEventListener('click', () => {
  if (model) {
    startGameContainer.style.display = 'none';
    inGameContainer.style.display = 'flex';

    alertTimer();
    //Set Score to  0 
    score = 0;
    updateScore(0);
    gameStartSound.play();
    isGameStarted = true;
    isGameEnd = false;
    enableCam()
    //Using set time out to start the rendering balls after the alert timer function completes
    setTimeout(() => {
      animate();
      startRenderingBallsInterval();
      startGameTimer();
    }, 4000)
  } else {
    console.warn('pleas wate for model to load');
  }
})

//Count Down Function
const alertTimer = () => {
  const countDownContainer = document.getElementById('countDownContainer');
  let currentSecond = 3;
  let timerInterval = setInterval(() => {
    countDownContainer.innerHTML = ``;
    countDownContainer.innerHTML = `<h1>${currentSecond}</h1>`;
    currentSecond -= 1;
    if (currentSecond < 0) {
      clearInterval(timerInterval);
      countDownContainer.innerHTML = ``;
      isGamePause = false;
      return
    }
    timeBeepSound.play()
  }, 1000)
}

//Game timer function 
const startGameTimer = () => {
  if (!isGameStarted) {
    return
  }
  //Number of Minutes the game should run.
  let minutesInGame = 2;
  let totalTime = minutesInGame * 60;

  //Interval to update the timer
  let interval = setInterval(() => {

    let min = Math.floor(totalTime / 60);
    let sec = totalTime % 60;

    document.getElementById('gameMinuteAndSecond').innerHTML = `${min < 10 ? '0' + min : min} : ${sec < 10 ? '0' + sec : sec}`

    totalTime--;
    //When the time is over
    if (totalTime < 0) {
      clearInterval(interval);
      document.getElementById('gameMinuteAndSecond').innerHTML = `00 : 00`;
      endGameContainer.style.display = 'flex';
      document.getElementById('endGameScore').innerHTML = score;
      isGameEnd = true;
      isGameStarted = false;
      gameEndSound.play();
      //Clearing the canvas
      ballArray = [];
      ballParticlesArray = [];
      enemyBombArray = [];
    }
  }, 1000)
}

let score = 0;
//Trying to fetch high score from the local storage, if not use 0;
let highScore = localStorage.getItem('highScore') || 0;
document.getElementById('highScore').innerHTML = highScore;
document.getElementById('homeHighScore').innerHTML = highScore;


//Function to update score
const updateScore = (noOfScore) => {
  //If noOfScore is in negative
  if (noOfScore + score < 0) {
    score = 0;
    return
  }
  score = score + noOfScore;
  if (score > highScore) {
    localStorage.setItem('highScore', score);
    document.getElementById('highScore').innerHTML = score;
    document.getElementById('homeHighScore').innerHTML = score;
  }
  document.getElementById('score').innerHTML = score;
}

updateScore(0);

//Main Logic for canvas

const canvas = document.getElementById('canvas');

const context = canvas.getContext('2d');

//Set canvas to full Screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//All Elements array
let ballArray = [];
let ballParticlesArray = [];
let enemyBombArray = [];
function createDot(x, y) {
  context.beginPath();
  context.arc(x * window.innerWidth, y * window.innerHeight, 5, 0, 2 * Math.PI);
  context.fillStyle = 'red';
  context.fill();
  context.closePath();
}
//Ball Class
function Ball() {

  this.x = Math.floor(Math.random() * window.innerWidth);
  this.y = Math.floor(window.innerHeight);
  this.size = Math.floor((Math.random() * 10) + 35);
  this.color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

  this.speedY = 10;
  this.speedX = Math.round((Math.random() - 0.5) * 4);

  //Updating Ball Position
  this.update = () => {
    this.y -= this.speedY;
    this.x += this.speedX;
    this.speedY -= .1;
  }

  //Rendering or Drawing Ball on the canvas
  this.draw = () => {
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
  }
}

//Ball Particles Class
function BallParticles(x, y, color) {

  this.x = x;
  this.y = y;
  this.size = Math.floor(Math.random() * 3 + 8);
  this.color = color;

  this.speedY = Math.random() * 2 - 2;
  this.speedX = Math.round((Math.random() - 0.5) * 10);

  //Updating Ball Particle
  this.update = () => {
    //Decrease size if this.size is greater then .2
    if (this.size > .2) {
      this.size -= .1;
    }
    this.y += this.speedY;
    this.x += this.speedX;
  }

  //Rendering or Drawing Ball on the canvas
  this.draw = () => {
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
  }
}


//Enemy Bomb Class
function EnemyBomb() {

  this.x = Math.floor(Math.random() * window.innerWidth);
  this.y = Math.floor(window.innerHeight);
  this.size = Math.floor((Math.random() * 10) + 40);
  this.color = `black`;

  this.speedY = 10;
  this.speedX = Math.round((Math.random() - 0.5) * 4);

  //Updating Bomb Position
  this.update = () => {
    this.y -= this.speedY;
    this.x += this.speedX;
    this.speedY -= .1;
  }

  this.draw = () => {
    context.fillStyle = this.color;
    context.beginPath();
    context.lineWidth = 6;
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.strokeStyle = 'red';
    context.stroke();
    context.fill();
  }
}


let strikeCount = 1;
//Variable to store when was the last ball sliced
let lastBallSlice;

function renderBalls() {
  for (let i = 0; i < ballArray.length; i++) {
    ballArray[i].draw();
    ballArray[i].update();

    //Detection Collision of Mouse Position and Ball Position
    let distanceBetweenMouseAndBall = Math.hypot(Lwrist.mouseX - ballArray[i].x, Lwrist.mouseY - ballArray[i].y)

    let distanceBetweenMouseAndBall2 = Math.hypot(Rwrist.mouseX - ballArray[i].x, Rwrist.mouseY - ballArray[i].y)


    //If Mouse is on the ball i.e Collision
    if (distanceBetweenMouseAndBall - ballArray[i].size < 1 || distanceBetweenMouseAndBall2 - ballArray[i].size < 1) {

      //Rendering Ball Particles 
      for (let index = 0; index < 8; index++) {
        ballParticlesArray.push(new BallParticles(ballArray[i].x, ballArray[i].y, ballArray[i].color));
      }
      let timeNow = new Date().getTime()
      //Subtracting the timenow by lastBallSlice and if less then .5 second then add the strike
      if (timeNow - lastBallSlice < 500) {
        strikeCount += 1;
        document.getElementById('strikeCountDiv').innerHTML = `<h1 class="strikeCount">${strikeCount}x</h1>`
      } else {
        strikeCount = 1;
        document.getElementById('strikeCountDiv').innerHTML = `<h1 class="strikeCount">${strikeCount}x</h1>`
      }
      lastBallSlice = new Date().getTime();
      //If ball size is less than 40 update score to 3 or 5
      let scoreToUpdate = (ballArray[i].size < 40 ? 3 : 5) + strikeCount;
      updateScore(scoreToUpdate)

      //Splicing the ball from the array
      ballArray.splice(i, 1);
      i--;
      return
    }

    //Splice the ball if it reached the bottom of the screen
    if (ballArray[i].y > window.innerHeight + 10) {
      ballArray.splice(i, 1);
      i--;
    }
  }
}


function renderEnemyBombs() {
  for (let i = 0; i < enemyBombArray.length; i++) {
    enemyBombArray[i].draw();
    enemyBombArray[i].update();

    //Detection Collision of Mouse Position and Ball Position
    let distanceBetweenMouseAndEnemy = Math.hypot(Lwrist.mouseX - enemyBombArray[i].x, Lwrist.mouseY - enemyBombArray[i].y)
    let distanceBetweenMouseAndEnemy2 = Math.hypot(Rwrist.mouseX - enemyBombArray[i].x, Rwrist.mouseY - enemyBombArray[i].y)


    //If Mouse is on the ball i.e Collision
    if (distanceBetweenMouseAndEnemy - enemyBombArray[i].size < 1 || distanceBetweenMouseAndEnemy2 - enemyBombArray[i].size < 1) {

      if (isGamePause) {
        return
      }
      //Clearing Canvas when player touches the bomb
      ballArray = [];
      ballParticlesArray = [];
      isGamePause = true;
      //Count Down for 3 Seconds
      alertTimer();
      updateScore(-7);
      bombTouchSound.play();
      //Splicing the ball from the array
      enemyBombArray.splice(i, 1);
      i--;
      return
    }

    //Splice the bomb when reached the bottom
    if (enemyBombArray[i].y > window.innerHeight + 10) {
      enemyBombArray.splice(i, 1);
      i--;
    }
  }
}



function renderBallParticles() {
  for (let i = 0; i < ballParticlesArray.length; i++) {
    ballParticlesArray[i].draw();
    ballParticlesArray[i].update();

    //If ball particles size is too small splice from the array
    if (ballParticlesArray[i].size <= .2) {
      ballParticlesArray.splice(i, 1);
      i--;
    }
  }
}

let numberOfBallsToRender = [1, 1, 1, 1, 1];

//SetInterval to render the balls on an interval of 1 second
const startRenderingBallsInterval = () => {
  let interval = setInterval(() => {
    // Clear the interval if the game is end.
    if (isGameEnd) {
      clearInterval(interval);
      return;
    }
    // Return if the game is paused.
    if (isGamePause) {
      return;
    }

    // Generate a random number to determine the number of balls to render.
    const numberOfBalls = Math.round(Math.random() * numberOfBallsToRender.length);
    // Determine the actual number of balls to render based on the random number.
    let indexOf = numberOfBallsToRender[numberOfBalls];

    // If the randomly generated number is greater than 0, generate an enemy bomb.
    if (numberOfBalls > 3) {
      enemyBombArray.push(new EnemyBomb());
    }

    // Number of balls to be rendered on the canvas using a for loop.
    for (let i = 0; i < indexOf; i++) {
      ballArray.push(new Ball());
    }
  }, 1000);
};

//Game Status Variables
let isGameStarted = false;
let isGamePause = false;
let isGameEnd = false;

let animationId;

//Animate function to render every....
function animate() {
  context.fillStyle = 'rgba(24,28,31,.5)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  renderBalls();
  renderBallParticles();
  renderEnemyBombs();

  //Cancel animation when the game is end.
  if (isGameEnd) {
    cancelAnimationFrame(animationId);
    return
  }
  animationId = requestAnimationFrame(animate);
}

// enemyBombArray.push(new EnemyBomb());

let mouseX = 0;
let mouseY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let isMouseClicked = false;

let linesArray = [];

function renderMouseLines(a) {
  console.log(a)
  console.log(a.length)
  for (let i = 0; i < a.length; i++) {
    context.strokeStyle = 'white';
    context.beginPath();

    context.moveTo(a[i].x, a[i].y);
    context.lineTo(a[i].pMouseX, a[i].pMouseY);
    context.stroke();
    context.lineWidth = 4;
    context.closePath();
  }
  //If the length of this array is greater then 4 splice the first object of this array using shift();
  if (a.length > 4) {
    if (!isSwordSoundPlaying) {
      playSwordSound();
    }
    a.shift();
    a.shift();
  }
}


//Event listener to detect when left button of mouse is clicked


//When mouse is moving
let position = () => {

  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseX = left_wristX;
  mouseY = left_wristY;
  // linesArray.push({ x: mouseX, y: mouseY, pMouseX: prevMouseX, pMouseY: prevMouseY })
  // console.log(linesArray)

}

//When the mouse button is released
canvas.addEventListener('mouseup', () => {
  mouseX = 0;
  mouseY = 0;
  linesArray = [];
  isMouseClicked = false;
})
//When the mouse is out of the tab or window
canvas.addEventListener('mouseout', () => {
  mouseX = 0;
  linesArray = [];
  mouseY = 0;
  isMouseClicked = false;
})

//Function and imports to return home when game is end.
const returnHomeButton = document.getElementById('returnHome');
const endGameContainer = document.getElementById('gameEndDiv');

returnHomeButton.addEventListener('click', () => {
  if (!isGameEnd) {
    return
  }
  buttonPushSound.play();
  endGameContainer.style.display = 'none';
  startGameContainer.style.display = 'flex';
  inGameContainer.style.display = 'none';
})
