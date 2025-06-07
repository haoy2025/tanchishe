// 在文件开头添加调试日志
console.log('脚本开始执行');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const speedControl = document.getElementById('speedControl');
const speedValue = document.getElementById('speedValue');
const loadingElement = document.getElementById('loading');
const restartButton = document.getElementById('restartButton');
const historyList = document.getElementById('historyList');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let score = 0;
let snake = [
    { x: 10, y: 10 }
];
let food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
};
let dx = 0;
let dy = 0;
let gameLoop;
let gameSpeed = 5;
let gameHistory = [];
let isPortalMode = false; // 添加模式标志
let bombs = [];  // 存储炸弹位置
let miniSnake = null;  // 存储小蛇信息
const BOMB_LIMIT = 3;  // 场上最多炸弹数量
const MINI_SNAKE_LENGTH = 3;  // 小蛇长度

// 从localStorage加载历史记录
loadHistory();

// 开始游戏
function startGame() {
    // 重置游戏状态
    score = 0;
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    scoreElement.textContent = score;
    generateFood();
    bombs = [];  // 清空炸弹
    miniSnake = null;  // 清空小蛇
    
    // 清除之前的游戏循环
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    
    // 开始新的游戏循环
    gameLoop = setInterval(drawGame, 200 - (gameSpeed * 15));
}

// 加载历史记录
function loadHistory() {
    const history = localStorage.getItem('snakeGameHistory');
    if (history) {
        gameHistory = JSON.parse(history);
        updateHistoryDisplay();
    }
}

// 保存历史记录
function saveHistory() {
    const now = new Date();
    const scoreRecord = {
        score: score,
        date: now.toLocaleString(),
        mode: isPortalMode ? '穿墙模式' : '经典模式'
    };
    gameHistory.unshift(scoreRecord);
    if (gameHistory.length > 10) {
        gameHistory.pop();
    }
    localStorage.setItem('snakeGameHistory', JSON.stringify(gameHistory));
    updateHistoryDisplay();
}

// 更新历史记录显示
function updateHistoryDisplay() {
    historyList.innerHTML = gameHistory.map(record => 
        `<div>得分：${record.score} - ${record.mode} - ${record.date}</div>`
    ).join('');
}

// 游戏结束处理
function handleGameOver() {
    clearInterval(gameLoop);
    saveHistory();
    alert('游戏结束！得分：' + score);
}

// 直接开始游戏
loadingElement.style.display = 'none';
startGame();

document.addEventListener('keydown', changeDirection);

function changeDirection(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    const keyPressed = event.keyCode;
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    if (keyPressed === LEFT_KEY && !goingRight) {
        dx = -1;
        dy = 0;
    }
    if (keyPressed === UP_KEY && !goingDown) {
        dx = 0;
        dy = -1;
    }
    if (keyPressed === RIGHT_KEY && !goingLeft) {
        dx = 1;
        dy = 0;
    }
    if (keyPressed === DOWN_KEY && !goingUp) {
        dx = 0;
        dy = 1;
    }
}

// 添加模式切换事件监听
document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
    radio.addEventListener('change', function() {
        isPortalMode = this.value === 'portal';
        startGame(); // 切换模式时重新开始游戏
    });
});

function handleWallCollision(position, max) {
    if (isPortalMode) {
        // 穿墙模式：从另一边出现
        return position < 0 ? max - 1 : position >= max ? 0 : position;
    }
    // 经典模式：返回原值，由 isGameOver 处理碰撞
    return position;
}

function drawGame() {
    // 移动蛇
    let newX = snake[0].x + dx;
    let newY = snake[0].y + dy;

    // 处理边界
    newX = handleWallCollision(newX, tileCount);
    newY = handleWallCollision(newY, tileCount);

    const head = { x: newX, y: newY };
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
    } else {
        snake.pop();
    }

    // 检查游戏结束条件
    if (isGameOver()) {
        clearInterval(gameLoop);
        alert('游戏结束！得分：' + score);
        return;
    }

    // 根据分数生成障碍物
    if (score >= 50 && Math.random() < 0.02) {  // 2% 概率生成炸弹
        generateBomb();
    }
    if (score >= 100 && !miniSnake) {
        generateMiniSnake();
    }
    
    // 更新小蛇位置
    if (miniSnake) {
        updateMiniSnake();
    }
    
    // 检查是否碰到炸弹或小蛇
    if (checkCollisions()) {
        return;
    }
    
    // 清空画布
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格背景
    ctx.strokeStyle = '#eee';
    for(let i = 0; i < tileCount; i++) {
        for(let j = 0; j < tileCount; j++) {
            ctx.strokeRect(i * gridSize, j * gridSize, gridSize, gridSize);
        }
    }

    // 清理过期的炸弹
    cleanExpiredBombs();
    
    // 绘制炸弹
    ctx.font = (gridSize-5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    bombs.forEach(bomb => {
        ctx.fillText('💣', bomb.x * gridSize + gridSize/2, bomb.y * gridSize + gridSize/2);
    });
    
    // 绘制小蛇
    if (miniSnake) {
        miniSnake.body.forEach((segment, index) => {
            if (index === 0) {
                ctx.fillText('🐍', segment.x * gridSize + gridSize/2, segment.y * gridSize + gridSize/2);
            } else {
                ctx.fillText(miniSnake.colors[index], segment.x * gridSize + gridSize/2, segment.y * gridSize + gridSize/2);
            }
        });
    }

    // 绘制萝卜（食物）
    ctx.font = (gridSize-5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥕', food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2);

    // 绘制蛇身（萝卜）
    for (let i = 1; i < snake.length; i++) {
        ctx.fillText('🥕', 
            snake[i].x * gridSize + gridSize/2, 
            snake[i].y * gridSize + gridSize/2
        );
    }

    // 绘制兔子头（蛇头）
    ctx.fillText('🐰', snake[0].x * gridSize + gridSize/2, snake[0].y * gridSize + gridSize/2);
}

function generateFood() {
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);
        
        valid = true;
        // 检查是否与炸弹重叠
        if (bombs.some(bomb => bomb.x === food.x && bomb.y === food.y)) {
            valid = false;
            continue;
        }
        // 检查是否与小蛇重叠
        if (miniSnake && miniSnake.body.some(segment => 
            segment.x === food.x && segment.y === food.y)) {
            valid = false;
            continue;
        }
        // 检查是否与玩家蛇重叠
        if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
            valid = false;
        }
    }
}

function isGameOver() {
    if (!isPortalMode) {
        // 经典模式：撞墙判定
        if (snake[0].x < 0 || snake[0].x >= tileCount || 
            snake[0].y < 0 || snake[0].y >= tileCount) {
            handleGameOver();
            return true;
        }
    }

    // 撞到自己的判定（两种模式都适用）
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            handleGameOver();
            return true;
        }
    }
    return false;
}

// 添加重新开始按钮事件监听
restartButton.addEventListener('click', startGame);

// 速度控制
speedControl.addEventListener('input', function() {
    gameSpeed = this.value;
    speedValue.textContent = gameSpeed;
    
    // 重新设置游戏循环
    clearInterval(gameLoop);
    gameLoop = setInterval(drawGame, 200 - (gameSpeed * 15));
});

// 添加生成炸弹的函数
function generateBomb() {
    if (bombs.length >= BOMB_LIMIT) return;
    
    const bomb = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
        createTime: Date.now()  // 添加创建时间戳
    };
    
    // 确保炸弹不会生成在蛇身上或食物上
    const isValidPosition = !snake.some(segment => 
        segment.x === bomb.x && segment.y === bomb.y) && 
        !(food.x === bomb.x && food.y === bomb.y);
    
    if (isValidPosition) {
        bombs.push(bomb);
    }
}

// 添加炸弹清理函数
function cleanExpiredBombs() {
    const now = Date.now();
    bombs = bombs.filter(bomb => now - bomb.createTime < 5000); // 5秒后消失
}

// 添加生成小蛇的函数
function generateMiniSnake() {
    if (miniSnake) return;
    
    const x = Math.floor(Math.random() * tileCount);
    const y = Math.floor(Math.random() * tileCount);
    
    // 为小蛇身体的每个部分随机分配颜色
    const colors = Array(MINI_SNAKE_LENGTH).fill().map(() => {
        const colorChoices = ['🔴', '🔵', '🟢'];  // 使用彩色圆形emoji
        return colorChoices[Math.floor(Math.random() * colorChoices.length)];
    });
    
    miniSnake = {
        body: Array(MINI_SNAKE_LENGTH).fill().map(() => ({ x, y })),
        colors: colors,  // 存储颜色信息
        dx: Math.random() < 0.5 ? 1 : -1,
        dy: 0,
        moveCounter: 0
    };
}

// 更新小蛇移动
function updateMiniSnake() {
    if (!miniSnake) return;
    
    miniSnake.moveCounter++;
    if (miniSnake.moveCounter < 5) return;  // 减慢小蛇移动速度
    
    miniSnake.moveCounter = 0;
    
    // 随机改变方向
    if (Math.random() < 0.1) {
        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];
        const newDir = directions[Math.floor(Math.random() * directions.length)];
        miniSnake.dx = newDir.dx;
        miniSnake.dy = newDir.dy;
    }
    
    // 移动小蛇
    const head = {
        x: (miniSnake.body[0].x + miniSnake.dx + tileCount) % tileCount,
        y: (miniSnake.body[0].y + miniSnake.dy + tileCount) % tileCount
    };
    
    miniSnake.body.unshift(head);
    miniSnake.body.pop();
}

// 添加碰撞检测函数
function checkCollisions() {
    const head = snake[0];
    
    // 检查是否碰到炸弹
    const bombHit = bombs.some(bomb => bomb.x === head.x && bomb.y === head.y);
    if (bombHit) {
        handleGameOver();
        return true;
    }
    
    // 检查是否碰到小蛇
    if (miniSnake && miniSnake.body.some(segment => 
        segment.x === head.x && segment.y === head.y)) {
        handleGameOver();
        return true;
    }
    
    return false;
} 