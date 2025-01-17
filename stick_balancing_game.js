// Stick Balancing Game with Tutorial

// Set up the canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Game variables
let discX = canvas.width / 2;
const discWidth = 100;
const discHeight = 10;
let stickAngle = Math.PI / 2; // Stick starts vertical
let stickLength = 150;
let angularVelocity = 0;
let gravity = 0.002;
let windStrength = 0;
let windDirection = 1; // 1 for right, -1 for left
let timeElapsed = 0;
let gameRunning = true;
let gamePaused = false;
let score = 0;
let highestScore = 0;
let gracePeriod = true;
let weather = 'clear'; // 'clear', 'rain', or 'snow'
let friction = 1; // Default friction value
let lastWeatherChange = 0; // Tracks the last time weather was changed
const weatherChangeInterval = Math.random() * 15000 + 15000; // Change weather every 30 seconds
const weatherOptions = ['rain', 'snow', 'clear']; // Array of weather options
let powerUps = []; // Array to hold power-ups
let activePowerUps = {}; // Track active power-ups

let tutorialActive = true; // Tutorial flag

let lastLightningTime = 0;
let lightningInterval = Math.random() * 5000 + 2000; // Lightning every 2-7 seconds
let lightningFlashDuration = 200; // Lightning flash duration in milliseconds
let isLightning = false;

const backgroundMusic = new Audio('background-music.mp3'); // Replace with your music file path
backgroundMusic.loop = true; // Make the music loop continuously
backgroundMusic.volume = 1.0; // Set the volume (0.0 to 1.0)
const rainMusic = new Audio('rain-music.mp3');
rainMusic.loop = true;
rainMusic.volume = 1.0;
const snowMusic = new Audio('snow-music.mp3');
snowMusic.loop = true;
snowMusic.volume = 1.0;

// Resize canvas to fit browser window
function resizeCanvas() {
   const savedImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Resize the canvas to fit the browser window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Restore the content after resizing
    ctx.putImageData(savedImage, 0, 0);

    // Optionally, adjust game variables (like discX) to align with the new canvas size
    discX = canvas.width / 2;
}

// Initialize canvas size
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse movement
canvas.addEventListener('mousemove', (event) => {
    if (gamePaused || tutorialActive) return;

    const rect = canvas.getBoundingClientRect();
    const prevDiscX = discX;
    discX = event.clientX - rect.left;

    if (!gracePeriod) {
        // Apply counterbalance force based on disc movement
        angularVelocity += (discX - prevDiscX) * 0.0003 * friction; // Adjusted by friction
    }

    // Clamp disc position within canvas
    discX = Math.max(discWidth / 2, Math.min(canvas.width - discWidth / 2, discX));
});

// Pause/Resume the game
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
		event.preventDefault(); // Prevent the browser from scrolling
        gamePaused = !gamePaused;
        if (gamePaused) {
            backgroundMusic.pause(); // Pause the music
			snowMusic.pause();
			rainMusic.pause();
        } else {
					if (weather === 'rain') {
					snowMusic.pause();
					backgroundMusic.pause();
					rainMusic.play();
				} else if (weather === 'snow') {
					
					backgroundMusic.pause();
					rainMusic.pause();
					snowMusic.play();
				} else if (weather === 'clear') {
					snowMusic.pause();
					rainMusic.pause();
					backgroundMusic.play();
				}// Resume the music
        }
        if (!gamePaused && gameRunning) {
            requestAnimationFrame(gameLoop);
        }
    }
});

// Stop timer and animations when window is inactive
window.addEventListener('blur', () => {
    if (!gameRunning) gamePaused = true;
});

// Resume timer when window is active
window.addEventListener('focus', () => {
    if (!gameRunning) gamePaused = false;
});

function resetGame() {
    stickAngle = Math.PI / 2;
    angularVelocity = 0;
    timeElapsed = 0; // Reset the timer
    windStrength = 0;
    windDirection = 1;
    gracePeriod = true;
    weather = 'clear';
	particles = [];
    powerUps = [];
    activePowerUps = {};
    friction = 1;
    score = 0; // Reset the score for the new game
    lastTime = null; // Ensure lastTime is reset
    setTimeout(() => (gracePeriod = false), 2000); // 2 seconds grace period
    gameRunning = true;
    tutorialActive = true; // Reactivate tutorial on reset
	
	// Restart the music from the beginning if the game ends
    backgroundMusic.currentTime = 0; 
    backgroundMusic.play();
}

// Draw the game tutorial
function drawTutorial() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

	// Set background color
	ctx.fillStyle = 'lightblue'; // Change to your desired color
	ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas

	// Draw the game instructions
	ctx.fillStyle = 'black'; // Text color
	ctx.font = '20px Arial'; // Text font and size
	ctx.textAlign = 'center'; // Center the text horizontally
	ctx.fillText('Welcome to the Stick Balancing Game!', canvas.width / 2, canvas.height / 3);
	ctx.fillText('Use your mouse to move the disc left or right.', canvas.width / 2, canvas.height / 3 + 30);
	ctx.fillText('Keep the stick balanced as long as possible.', canvas.width / 2, canvas.height / 3 + 60);
	ctx.fillText('Avoid falling due to wind or gravity!', canvas.width / 2, canvas.height / 3 + 90);
	ctx.fillText('Click to start the game.', canvas.width / 2, canvas.height / 3 + 150);

}

// Power-up class
class PowerUp {
    constructor(x, type) {
        this.x = x; // Horizontal position
        this.y = -20; // Start off-screen
        this.type = type; // Type of power-up
        this.size = 20; // Size of the power-up
        this.velocityY = 2; // Falling speed
    }

    update() {
        this.y += this.velocityY; // Move downward
        // Remove power-up if it goes off-screen
        if (this.y > canvas.height) {
            powerUps.splice(powerUps.indexOf(this), 1);
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.type === 'windShield' ? 'black' : 'orange';
        ctx.fillRect(this.x, this.y, this.size, this.size); // Draw power-up
    }
}

function generatePowerUp() {
    const x = Math.random() * canvas.width;
    const types = ['windShield', 'stickFreeze'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push(new PowerUp(x, type));
}

// Particle effect variables
let particles = [];

// Particle effect class
class Particle {
    constructor(x, y, color, size, velocityY) {
        this.x = x; // Horizontal position
        this.y = y; // Vertical position
        this.color = color; // Color of the particle
        this.size = size; // Size of the particle
        this.velocityY = velocityY; // Vertical velocity
    }

    update() {
        this.y += this.velocityY; // Move downward
        // Reset particle when it goes off-screen
        if (this.y > canvas.height) {
            this.y = -10; // Recycle particle to the top
            this.x = Math.random() * canvas.width; // Randomize horizontal position
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); // Draw a circle for the particle
        ctx.fill();
    }
}

function generateRain() {
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = 'blue'; // Rain color
        const size = Math.random() * 2 + 1; // Smaller size for rain
        const velocityY = Math.random() * 3 + 2; // Faster velocity for rain
        particles.push(new Particle(x, y, color, size, velocityY));
    }
	  // Handle lightning effect
    const currentTime = performance.now(); // Get the current time
    if (currentTime - lastLightningTime > lightningInterval) {
        isLightning = true; // Trigger lightning
        lastLightningTime = currentTime; // Update the last lightning time
        lightningInterval = Math.random() * 5000 + 2000; // Randomize the next interval

        // Turn off lightning after the flash duration
        setTimeout(() => {
            isLightning = false;
        }, lightningFlashDuration);
    }
}

function generateSnow() {
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = 'white'; // Snow color
        const size = Math.random() * 5 + 2; // Larger size for snow
        const velocityY = Math.random() * 1 + 0.5; // Slower velocity for snow
        particles.push(new Particle(x, y, color, size, velocityY));
    }
}

function updateParticles() {
    particles.forEach((particle) => particle.update());
}

function drawParticles(ctx) {
    particles.forEach((particle) => particle.draw(ctx));
}

function changeWeather(newWeather) {
    weather = newWeather; // Update the current weather
    particles = []; // Clear existing particles

    // Generate particles for the new weather
    if (weather === 'rain') {
		snowMusic.pause();
		backgroundMusic.pause();
		rainMusic.play();
        generateRain();
    } else if (weather === 'snow') {
		
		backgroundMusic.pause();
		rainMusic.pause();
		snowMusic.play();
        generateSnow();
    } else if (weather === 'clear') {
        snowMusic.pause();
        rainMusic.pause();
        backgroundMusic.play();
    }
}
function drawSnowflake(x, y, size) {
    ctx.save(); // Save the current canvas state
    ctx.translate(x, y); // Move the origin to the snowflake's position
    ctx.strokeStyle = '#FFFFFF'; // Snowflake color
    ctx.lineWidth = 1;

    for (let i = 0; i < 6; i++) { // Six branches for symmetry
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size); // Draw a line outward
        ctx.stroke();

        // Add smaller branches
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 4, -size * 0.75);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(-size / 4, -size * 0.75);
        ctx.stroke();

        ctx.rotate((Math.PI * 2) / 6); // Rotate to the next branch
    }

    ctx.restore(); // Restore the canvas state
}
// Draw dynamic background based on weather
function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (weather === 'clear') {
		// Clear sky
        ctx.fillStyle = '#87CEEB'; // Sky blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'yellow'; // Sun
        ctx.beginPath();
        ctx.arc(canvas.width - 100, 100, 50, 0, Math.PI * 2);
        ctx.fill();
    } else if (weather === 'rain') {
		
		// Dark clouds
			if (isLightning) {
			// Lightning flash effect
			ctx.fillStyle = 'white'; // Flash of lightning
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else {
			// Normal rainy background
			ctx.fillStyle = '#696969'; // Dark grey for rain
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
    } else if (weather === 'snow') {
		
        // Light grey for snow clouds
        ctx.fillStyle = '#D3D3D3'; // Light grey
		ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 51; i++) {
			const x = Math.random() * canvas.width;
			const y = Math.random() * canvas.height;
			const size = 10; // Fixed size for even snowflakes
			drawSnowflake(x, y, size);
		}
    }
}

// Update the game state
function update(deltaTime) {
    if (!gameRunning || gamePaused) return;

    timeElapsed += deltaTime;

    // Increase difficulty over time
    if (timeElapsed > 5000) {
        windStrength = Math.min(0.003, 0.00003 * (timeElapsed / 50000)); // Increase wind strength gradually
        windDirection = Math.random() > 0.005 ? 1 : -1;
    }
	
	 // Change weather periodically
        if (timeElapsed - lastWeatherChange > weatherChangeInterval) {
            const randomWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
            changeWeather(randomWeather); // Dynamically switch weather
            lastWeatherChange = timeElapsed; // Update the last weather change time
            friction = randomWeather === 'rain' ? 0.98 : randomWeather === 'snow' ? 0.95 : 1;
        }
		
    // Apply wind force only after grace period
    if (!gracePeriod) {
        angularVelocity += windStrength * windDirection;
        angularVelocity += gravity * Math.sin(stickAngle - Math.PI / 2); // Gravity
    }

    // Apply damping to make balancing more realistic
    angularVelocity *= 0.995;

    // Update stick angle
    stickAngle += angularVelocity;

    // Increment score based on time survived
    score = Math.floor(timeElapsed / 1000);

    // Check for game over
    if (!gracePeriod && (stickAngle < Math.PI / 4 || stickAngle > (3 * Math.PI) / 4)) {
        gameRunning = false;

        // Update highest score when the game ends
        if (score > highestScore) {
            highestScore = score;
        }

        // Generate particles for game over effect
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle(discX, canvas.height - 200, 'red', Math.random() * 5 + 2, Math.random() * -2 - 1));
        }
    }

    // Update power-ups
    powerUps.forEach((powerUp) => {
        powerUp.update();
        // Check for collision with disc
        if (powerUp.y + powerUp.size > canvas.height - 200 &&
            powerUp.x + powerUp.size > discX - discWidth / 2 &&
            powerUp.x < discX + discWidth / 2) {
            // Apply power-up effect
            activatePowerUp(powerUp.type);
            powerUps.splice(powerUps.indexOf(powerUp), 1); // Remove power-up after collection
        }
    });

    // Generate power-ups randomly
    if (Math.random() < 0.01) {
        generatePowerUp();
    }

    updateParticles();
}

// Activate power-ups
function activatePowerUp(type) {
    if (type === 'windShield') {
		const previousWindStrength = windStrength; // Store previous wind strength
        windStrength = 0; // Negate wind effects
		score = Math.floor(timeElapsed / 1000) + (activePowerUps.windShield ? 50 : 0);
        activePowerUps.windShield = setTimeout(() => {
			windStrength = previousWindStrength; // Restore previous wind strength
            delete activePowerUps.windShield;
        }, 5000); // Wind shield lasts 5 seconds
    } else if (type === 'stickFreeze') {
		const previousAngularVelocity = angularVelocity; // Store previous angular velocity
        stickAngle = Math.PI / 2; // Reset stick angle to horizontal
        angularVelocity = 0; // Stop any angular movement
        activePowerUps.stickFreeze = true;
		score = Math.floor(timeElapsed / 1000) + (activePowerUps.stickFreeze ? 50 : 0);
        setTimeout(() => {
			 angularVelocity = previousAngularVelocity; 
            delete activePowerUps.stickFreeze;
        }, 5000); // Stick freeze lasts 3 seconds
    }
}

// Draw the game elements
function draw() {
    drawBackground(); // Draw dynamic background

    // Draw disc
    ctx.fillStyle = 'blue';
    ctx.fillRect(discX - discWidth / 2, canvas.height - 200, discWidth, discHeight);

    // Draw stick
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(discX, canvas.height - 200);
    ctx.lineTo(
        discX + stickLength * Math.cos(stickAngle),
        canvas.height - 200 - stickLength * Math.sin(stickAngle)
    );
    ctx.stroke();

    // Draw power-ups
    powerUps.forEach((powerUp) => powerUp.draw(ctx));

    // Draw time elapsed
    ctx.fillStyle = 'orange';
    ctx.font = '20px Arial';
    ctx.fillText(`Time: ${(timeElapsed / 1000).toFixed(1)}s`, 60, 30);

    // Draw score
    ctx.fillStyle = 'green';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 60, 60);

    // Draw highest score
    ctx.fillStyle = 'purple';
    ctx.font = '20px Arial';
    ctx.fillText(`Highest Score: ${highestScore}`, 80, 90);

    // Draw game over text
    if (!gameRunning) {
        ctx.fillStyle = 'red';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over!', canvas.width / 2 - 80, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Click to Restart', canvas.width / 2 - 80, canvas.height / 2 + 40);
		backgroundMusic.pause();
		snowMusic.pause();
        rainMusic.pause();
    }

    drawParticles(ctx);
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
    if (tutorialActive) {
        drawTutorial();
        return;
    }

    if (!lastTime) lastTime = timestamp; // Initialize lastTime for the first frame
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    if (gameRunning && !gamePaused) {
        requestAnimationFrame(gameLoop);
    }
}

// Start game
canvas.addEventListener('click', () => {	
	
	if (tutorialActive) {
		backgroundMusic.play();
		tutorialActive = false;
		requestAnimationFrame(gameLoop);
	}
	
    if (!gameRunning) {
		backgroundMusic.pause(); // Stop playing background music
		snowMusic.pause();
        rainMusic.pause();
        resetGame();
        requestAnimationFrame(gameLoop); // Restart the game loop
    }
});

resetGame();
requestAnimationFrame(gameLoop);
