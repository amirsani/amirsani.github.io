const { useState, useCallback, useRef } = React;

function ReturnSimulation() {
  const width = 800;
  const height = 600;
  const pinRadius = 4;
  const ballRadius = 6;
  const rows = 12;
  const gravity = 0.25;
  const dampening = 0.6;
  const histogramHeight = 150;

  const binWidths = [0.22, 0.23, 0.25, 0.21, 0.09];
  const binLabels = ['<1x', '1x-2x', '2x-5x', '5x-10x', '>10x'];
  const binColors = ['#ff4444', '#ffaa00', '#2ecc71', '#27ae60', '#145a32'];

  const [stats, setStats] = useState({
    balls: 0,
    returns: new Array(binWidths.length).fill(0),
    history: []
  });
  
  const [activeBalls, setActiveBalls] = useState([]);
  const animationFrameRef = useRef();

  const generatePinGrid = useCallback(() => {
    const pins = [];
    const topY = 50;
    const rowHeight = (height - histogramHeight - 100) / (rows - 1);
    const centerX = width / 2;
    const maxPinSpacing = width * 0.7 / (rows + 1);

    for (let row = 0; row < rows; row++) {
      const pinsInRow = row + 1;
      const rowWidth = maxPinSpacing * row;
      const startX = centerX - rowWidth / 2;

      for (let pin = 0; pin < pinsInRow; pin++) {
        const x = startX + (pin * maxPinSpacing);
        const y = topY + row * rowHeight;
        pins.push({ x, y });
      }
    }
    return pins;
  }, [width, height, rows]);

  const getBinEdges = useCallback(() => {
    const edges = [];
    let cumulative = 0;
    const startX = width * 0.15;
    const totalWidth = width * 0.7;

    edges.push(startX);
    for (const binWidth of binWidths) {
      cumulative += binWidth;
      edges.push(startX + totalWidth * cumulative);
    }
    return edges;
  }, [width, binWidths]);

  const updateBall = useCallback((ball, pins) => {
    ball.velocity.y += gravity;
    ball.x += ball.velocity.x;
    ball.y += ball.velocity.y;

    pins.forEach(pin => {
      const distance = Math.sqrt(Math.pow(pin.x - ball.x, 2) + Math.pow(pin.y - ball.y, 2));
      if (distance < pinRadius + ballRadius) {
        const angle = Math.atan2(ball.y - pin.y, ball.x - pin.x);
        const speed = Math.sqrt(Math.pow(ball.velocity.x, 2) + Math.pow(ball.velocity.y, 2));
        const deflectionAngle = angle + (Math.random() * 0.2 - 0.1);
        
        ball.velocity.x = Math.cos(deflectionAngle) * speed * dampening;
        ball.velocity.y = Math.abs(Math.sin(deflectionAngle) * speed * dampening);
      }
    });

    if (ball.x < width * 0.15 || ball.x > width * 0.85) {
      ball.velocity.x *= -dampening;
      ball.x = Math.max(width * 0.15, Math.min(ball.x, width * 0.85));
    }

    return ball;
  }, []);

  const animate = useCallback(() => {
    const pins = generatePinGrid();
    const binEdges = getBinEdges();
    
    setActiveBalls(prevBalls => {
      const updatedBalls = prevBalls.map(ball => {
        if (ball.y >= height - histogramHeight) {
          const finalBin = binEdges.findIndex((edge, i) => 
            ball.x >= edge && ball.x < (binEdges[i + 1] || width)
          );
          
          setStats(prev => ({
            balls: prev.balls + 1,
            returns: prev.returns.map((count, i) => 
              i === finalBin ? count + 1 : count
            ),
            history: [...prev.history, [...ball.path, { x: ball.x, y: ball.y }]]
          }));
          
          return null;
        }
        
        const updatedBall = updateBall({ ...ball }, pins);
        updatedBall.path.push({ x: updatedBall.x, y: updatedBall.y });
        return updatedBall;
      }).filter(Boolean);

      return updatedBalls;
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [generatePinGrid, getBinEdges, updateBall]);

  const dropBall = useCallback(() => {
    const newBall = {
      x: width / 2,
      y: 20,
      velocity: { x: 0, y: 0 },
      path: []
    };

    setActiveBalls(prev => [...prev, newBall]);

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [width, animate]);

  const pins = generatePinGrid();
  const binEdges = getBinEdges();

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4">
      <svg width={width} height={height} className="bg-black rounded-lg mb-4">
        <defs>
          <linearGradient id="boardGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="90%" stopColor="#111111" />
            <stop offset="100%" stopColor="#222222" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#boardGradient)" />

        {pins.map((pin, i) => (
          <circle
            key={`pin-${i}`}
            cx={pin.x}
            cy={pin.y}
            r={pinRadius}
            fill="#666"
          />
        ))}
        
        {binEdges.map((x, i) => (
          <line
            key={`edge-${i}`}
            x1={x}
            y1={height - histogramHeight}
            x2={x}
            y2={height}
            stroke="#333"
            strokeWidth={1}
          />
        ))}

        {stats.returns.map((_, i) => {
          const binWidth = binEdges[i + 1] - binEdges[i];
          const targetHeight = (binWidths[i] * histogramHeight);
          
          return (
            <line
              key={`target-${i}`}
              x1={binEdges[i]}
              y1={height - targetHeight}
              x2={binEdges[i] + binWidth}
              y2={height - targetHeight}
              stroke="#ffffff"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.3}
            />
          );
        })}

        {stats.history.map((path, pathIndex) => (
          <path
            key={`path-${pathIndex}`}
            d={`M ${path.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={`rgba(76, 175, 80, ${0.1 + (pathIndex / Math.max(stats.history.length, 1)) * 0.2})`}
            strokeWidth="2"
            fill="none"
          />
        ))}
        
        {activeBalls.map((ball, i) => (
          <circle
            key={`ball-${i}`}
            cx={ball.x}
            cy={ball.y}
            r={ballRadius}
            fill="#4CAF50"
          />
        ))}

        {stats.returns.map((count, i) => {
          const binWidth = binEdges[i + 1] - binEdges[i];
          const maxCount = Math.max(...stats.returns);
          const barHeight = maxCount > 0 ? 
            (count / maxCount) * histogramHeight : 0;
          
          return (
            <rect
              key={`hist-${i}`}
              x={binEdges[i] + 1}
              y={height - barHeight}
              width={binWidth - 2}
              height={barHeight}
              fill={binColors[i]}
              opacity={0.8}
            />
          );
        })}

        {binLabels.map((label, i) => {
          const x = binEdges[i] + (binEdges[i + 1] - binEdges[i]) / 2;
          return (
            <g key={`label-${i}`}>
              <text
                x={x}
                y={height - 25}
                fill="#fff"
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
              >
                {label}
              </text>
              <text
                x={x}
                y={height - 8}
                fill="#888"
                textAnchor="middle"
                fontSize="12"
              >
                Target: {(binWidths[i] * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button
            onClick={dropBall}
            className="simulation-container button"
          >
            Rain
          </button>
          <span className="ml-4 text-gray-600">
            Total Simulations: {stats.balls}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-4">
        {stats.returns.map((count, i) => {
          const percentage = stats.balls > 0 ? (count / stats.balls) * 100 : 0;
          const targetPercentage = binWidths[i] * 100;
          const deviation = percentage - targetPercentage;
          
          return (
            <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-bold text-lg mb-1">{binLabels[i]}</div>
              <div className="text-2xl font-bold mb-1">{percentage.toFixed(1)}%</div>
              <div className={`text-sm ${Math.abs(deviation) < 2 ? 'text-green-600' : 'text-orange-500'}`}>
                Target: {targetPercentage.toFixed(1)}%
                {stats.balls > 10 && (
                  <span className="block font-medium">
                    {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

ReactDOM.render(<ReturnSimulation />, document.getElementById('simulation-root'));
