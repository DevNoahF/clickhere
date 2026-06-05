import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SnakeGame.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const GAME_SPEED = 120;

function SnakeGame() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('loading');
  const [visitorInfo, setVisitorInfo] = useState(null);
  const [loadingText, setLoadingText] = useState('Inicializando...');
  const [loadProgress, setLoadProgress] = useState(0);

  const snakeRef = useRef([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const directionRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 15, y: 10 });
  const gameLoopRef = useRef(null);
  const dataRef = useRef(null);

  const detectDeviceType = () => {
    const ua = navigator.userAgent;
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
      if (/tablet|ipad/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
      return 'celular';
    }
    return 'desktop';
  };

  const getPublicIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch {
      return 'Nao foi possivel obter o IP';
    }
  };

  const sendVisitData = async (ip, deviceType) => {
    try {
      const res = await fetch(`${API_URL}/api/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          device_type: deviceType,
          user_agent: navigator.userAgent,
        }),
      });
      return await res.json();
    } catch {
      console.error('Failed to send visit data');
      return {};
    }
  };

  const spawnFood = useCallback(() => {
    const snake = snakeRef.current;
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    foodRef.current = pos;
  }, []);

  const autoDirection = useCallback(() => {
    const head = snakeRef.current[0];
    const food = foodRef.current;
    const dir = directionRef.current;

    const preferX = food.x - head.x;
    const preferY = food.y - head.y;

    const possible = [];
    if (preferX > 0 && dir.x !== -1) possible.push({ x: 1, y: 0 });
    else if (preferX < 0 && dir.x !== 1) possible.push({ x: -1, y: 0 });
    if (preferY > 0 && dir.y !== -1) possible.push({ x: 0, y: 1 });
    else if (preferY < 0 && dir.y !== 1) possible.push({ x: 0, y: -1 });

    if (possible.length === 0) {
      const allDirs = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
      ].filter((d) => !(d.x === -dir.x && d.y === -dir.y));
      possible.push(...allDirs);
    }

    for (const d of possible) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (!snakeRef.current.some((s) => s.x === nx && s.y === ny)) {
          directionRef.current = d;
          return;
        }
      }
    }

    for (const d of possible) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        directionRef.current = d;
        return;
      }
    }
  }, []);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#00ff88' : '#00cc6a';
      ctx.shadowBlur = index === 0 ? 15 : 5;
      ctx.shadowColor = '#00ff88';
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });
    ctx.shadowBlur = 0;

    const food = foodRef.current;
    ctx.fillStyle = '#ff4444';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4444';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const updateGame = useCallback(() => {
    const snake = snakeRef.current;
    const dir = directionRef.current;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return false;
    }

    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return false;
      }
    }

    snake.unshift(head);

    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      spawnFood();
    } else {
      snake.pop();
    }

    return true;
  }, [spawnFood]);

  const gameLoop = useCallback(() => {
    autoDirection();
    const result = updateGame();
    if (!result) {
      snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      directionRef.current = { x: 1, y: 0 };
      spawnFood();
    }
    drawGame();
  }, [autoDirection, updateGame, drawGame, spawnFood]);

  useEffect(() => {
    const init = async () => {
      setLoadingText('Aguarde :)');
      setLoadProgress(25);
      await new Promise((r) => setTimeout(r, 500));

      setLoadingText('Estamos quase lá :D');
      setLoadProgress(50);
      const ip = await getPublicIP();

      setLoadingText('Obrigado por aguardar!');
      setLoadProgress(65);
      const deviceType = detectDeviceType();
      const visitResult = await sendVisitData(ip, deviceType);
      const city = (visitResult && visitResult.city) || '';

      dataRef.current = { ip, deviceType, userAgent: navigator.userAgent, city };
      setVisitorInfo(dataRef.current);
      setLoadProgress(100);
      setLoadingText('Carregado!');

      await new Promise((r) => setTimeout(r, 600));

      setGameState('loaded');
    };

    init();
  }, []);

  useEffect(() => {
    spawnFood();
    gameLoopRef.current = setInterval(gameLoop, GAME_SPEED);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameLoop, spawnFood]);

  if (gameState === 'loading') {
    return (
      <div className="snake-container">
        <div className="game-header">
          <h1 className="title">Snake Game</h1>
        </div>
        <div className="game-wrapper">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="game-canvas"
          />
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="snake-loader">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <p className="loading-text">{loadingText}</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${loadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="snake-container">
      <div className="game-header">
        <h1 className="title">Obrigado por participar!</h1>
        <div>
            
        </div>
      </div>
    </div>
      
  );
}

export default SnakeGame;
