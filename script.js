const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Game state
        let score1 = 0;
        let score2 = 0;

        // Key states
        const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

        // Event Listeners for movement
        window.addEventListener('keydown', (e) => {
            if(keys.hasOwnProperty(e.key)) keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            if(keys.hasOwnProperty(e.key)) keys[e.key] = false;
        });

        // Entities
        const ball = {
            x: canvas.width / 2, y: canvas.height / 2,
            radius: 12, vx: 0, vy: 0, mass: 1,
            friction: 0.98, bounce: 0.8
        };

        const player1 = {
            x: 150, y: canvas.height / 2,
            radius: 20, vx: 0, vy: 0, speed: 4, mass: 3,
            color: '#ff4757', friction: 0.90
        };

        const player2 = {
            x: canvas.width - 150, y: canvas.height / 2,
            radius: 20, vx: 0, vy: 0, speed: 3.5, mass: 3,
            color: '#1e90ff', friction: 0.90
        };

        const goalHeight = 160;
        const goalTop = (canvas.height - goalHeight) / 2;
        const goalBottom = goalTop + goalHeight;

        function drawField() {
            // Grass stripes
            const stripeWidth = 50;
            for (let i = 0; i < canvas.width; i += stripeWidth) {
                ctx.fillStyle = (i / stripeWidth) % 2 === 0 ? '#4CAF50' : '#45a049';
                ctx.fillRect(i, 0, stripeWidth, canvas.height);
            }

            // White lines
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            
            // Center line
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();

            // Center circle
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
            ctx.stroke();

            // Center dot
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();

            // Penalty areas (Left and Right)
            ctx.strokeRect(0, canvas.height/2 - 120, 120, 240);
            ctx.strokeRect(canvas.width - 120, canvas.height/2 - 120, 120, 240);

            // Goals
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(0, goalTop, 10, goalHeight);
            ctx.fillRect(canvas.width - 10, goalTop, 10, goalHeight);
            
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(0, goalTop, 10, goalHeight);
            ctx.fillStyle = '#1e90ff';
            ctx.fillRect(canvas.width - 10, goalTop, 10, goalHeight);
        }

        function drawCircle(obj, isBall = false) {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fillStyle = isBall ? 'white' : obj.color;
            ctx.fill();
            
            // Add a little border/detail
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            if(isBall) {
                // Ball pentagon pattern imitation
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius/2, 0, Math.PI*2);
                ctx.fill();
            } else {
                // Player inner circle
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius - 8, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.stroke();
            }
        }

        function updatePlayer1() {
            if (keys.ArrowUp || keys.w) player1.vy -= player1.speed * 0.2;
            if (keys.ArrowDown || keys.s) player1.vy += player1.speed * 0.2;
            if (keys.ArrowLeft || keys.a) player1.vx -= player1.speed * 0.2;
            if (keys.ArrowRight || keys.d) player1.vx += player1.speed * 0.2;

            player1.vx *= player1.friction;
            player1.vy *= player1.friction;
            player1.x += player1.vx;
            player1.y += player1.vy;

            keepInBounds(player1);
        }

        function updatePlayer2_AI() {
            // Simple AI: Move towards the ball, but stay on the right half
            let dx = ball.x - player2.x;
            let dy = ball.y - player2.y;
            let dist = Math.hypot(dx, dy);

            // If ball is on the AI's half, charge it. Otherwise, defend goal.
            let targetX = ball.x > canvas.width / 2 ? ball.x + 10 : canvas.width - 100;
            let targetY = ball.x > canvas.width / 2 ? ball.y : canvas.height / 2;

            let tdx = targetX - player2.x;
            let tdy = targetY - player2.y;

            player2.vx += (tdx > 0 ? 1 : -1) * player2.speed * 0.1;
            player2.vy += (tdy > 0 ? 1 : -1) * player2.speed * 0.1;

            player2.vx *= player2.friction;
            player2.vy *= player2.friction;
            player2.x += player2.vx;
            player2.y += player2.vy;

            keepInBounds(player2);
            // Restrict AI from crossing half court too much
            if (player2.x < canvas.width / 2 + player2.radius) {
                player2.x = canvas.width / 2 + player2.radius;
                player2.vx = 0;
            }
        }

        function keepInBounds(obj) {
            if (obj.x - obj.radius < 0) { obj.x = obj.radius; obj.vx *= -0.5; }
            if (obj.x + obj.radius > canvas.width) { obj.x = canvas.width - obj.radius; obj.vx *= -0.5; }
            if (obj.y - obj.radius < 0) { obj.y = obj.radius; obj.vy *= -0.5; }
            if (obj.y + obj.radius > canvas.height) { obj.y = canvas.height - obj.radius; obj.vy *= -0.5; }
        }

        function checkCollision(p, b) {
            let dx = b.x - p.x;
            let dy = b.y - p.y;
            let distance = Math.hypot(dx, dy);
            
            if (distance < p.radius + b.radius) {
                // Resolution
                let angle = Math.atan2(dy, dx);
                let sin = Math.sin(angle);
                let cos = Math.cos(angle);

                // Push ball outside player
                let overlap = (p.radius + b.radius) - distance;
                b.x += cos * overlap;
                b.y += sin * overlap;

                // Transfer momentum
                let speed = Math.hypot(p.vx, p.vy);
                let kickForce = speed > 1 ? speed * 1.5 : 3; 

                b.vx = cos * kickForce + (p.vx * 0.5);
                b.vy = sin * kickForce + (p.vy * 0.5);
            }
        }

        function updateBall() {
            ball.vx *= ball.friction;
            ball.vy *= ball.friction;
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall bounces & Goals
            if (ball.x - ball.radius < 0) {
                if (ball.y > goalTop && ball.y < goalBottom) {
                    scoreGoal(2);
                } else {
                    ball.x = ball.radius;
                    ball.vx *= -ball.bounce;
                }
            }
            if (ball.x + ball.radius > canvas.width) {
                if (ball.y > goalTop && ball.y < goalBottom) {
                    scoreGoal(1);
                } else {
                    ball.x = canvas.width - ball.radius;
                    ball.vx *= -ball.bounce;
                }
            }
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.vy *= -ball.bounce;
            }
            if (ball.y + ball.radius > canvas.height) {
                ball.y = canvas.height - ball.radius;
                ball.vy *= -ball.bounce;
            }
        }

        function scoreGoal(playerNum) {
            if (playerNum === 1) {
                score1++;
                document.getElementById('score1').innerText = score1;
            } else {
                score2++;
                document.getElementById('score2').innerText = score2;
            }
            resetPositions();
        }

        function resetPositions() {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.vx = 0;
            ball.vy = 0;

            player1.x = 150;
            player1.y = canvas.height / 2;
            player1.vx = 0;
            player1.vy = 0;

            player2.x = canvas.width - 150;
            player2.y = canvas.height / 2;
            player2.vx = 0;
            player2.vy = 0;
        }

        function gameLoop() {
            // Update logic
            updatePlayer1();
            updatePlayer2_AI();
            
            checkCollision(player1, ball);
            checkCollision(player2, ball);
            
            updateBall();

            // Draw graphics
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawField();
            drawCircle(player1);
            drawCircle(player2);
            drawCircle(ball, true);

            requestAnimationFrame(gameLoop);
        }

        // Start game
        gameLoop();