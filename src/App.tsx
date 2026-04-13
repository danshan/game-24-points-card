import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, HelpCircle, CheckCircle2, AlertCircle, Delete, Play, Info, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import cardCover from './assets/card_cover.jpg';
import { generateCards, evaluateExpression, validateCardUsage, solve24 } from './lib/gameLogic';

export default function App() {
  const [cards, setCards] = useState<number[]>([]);
  const [usedCardIndices, setUsedCardIndices] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setIsDealing(true);
    setIsSolved(false);
    setShowSuccessOverlay(false);
    setUsedCardIndices([]);
    setInput('');
    setMessage(null);
    setHint(null);

    let newCards = generateCards();
    let solution = solve24(newCards);
    while (!solution) {
      newCards = generateCards();
      solution = solve24(newCards);
    }
    
    setCards(newCards);
    
    // Simulate dealing delay: wait for entry animation to finish before flipping
    // Increased delay to ensure they stay face down during the slide in
    setTimeout(() => {
      setIsDealing(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 600); // Wait for flip animation to complete
    }, 1500);
  };

  const handleGiveUp = () => {
    if (isSolved || isDealing) return;
    const solution = solve24(cards);
    if (solution) {
      setHint(solution);
      setMessage({ text: '这是这道题的一个正确答案。您可以手动验算或点击刷新换题。', type: 'info' });
      setIsSolved(true); // Mark as solved to show the solution
    }
  };

  const insertAtCursor = (text: string) => {
    if (!inputRef.current) return;
    
    const start = inputRef.current.selectionStart || 0;
    const end = inputRef.current.selectionEnd || 0;
    const newValue = input.substring(0, start) + text + input.substring(end);
    
    setInput(newValue);
    
    // Set cursor position after the inserted text
    const newCursorPos = start + text.length;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSolved) return;

    // 1. Validate card usage
    if (!validateCardUsage(input, cards)) {
      setMessage({ 
        text: '每张牌必须且只能使用一次！', 
        type: 'error' 
      });
      return;
    }

    // 2. Evaluate expression
    const result = evaluateExpression(input);
    if (result === null) {
      setMessage({ 
        text: '无效的表达式！', 
        type: 'error' 
      });
      return;
    }

    // 3. Check if result is 24
    if (Math.abs(result - 24) < 1e-6) {
      setMessage({ 
        text: '太棒了！回答正确！', 
        type: 'success' 
      });
      setIsSolved(true);
      setShowSuccessOverlay(true);
      
      // Bigger confetti effect
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Auto-next after 2.5 seconds
      setTimeout(() => {
        startNewGame();
      }, 2500);
    } else {
      setMessage({ 
        text: `结果是 ${Number(result.toFixed(2))}，再试一次吧！`, 
        type: 'error' 
      });
    }
  };

  const showHint = () => {
    const solution = solve24(cards);
    if (solution) {
      setHint(solution);
      setMessage({ text: '这是一个可能的解法。', type: 'info' });
    } else {
      setMessage({ text: '这组牌似乎无解。', type: 'error' });
    }
  };

  const handleCardClick = (num: number, index: number) => {
    if (isSolved || isDealing) return;
    
    if (usedCardIndices.includes(index)) {
      // Un-use card: remove from used indices and remove one instance of the number from input
      setUsedCardIndices(prev => prev.filter(i => i !== index));
      
      // Simple logic to remove the number from input
      // We look for the number as a standalone token if possible
      const numStr = num.toString();
      const regex = new RegExp(`\\b${numStr}\\b`);
      const match = input.match(regex);
      
      if (match) {
        const newInputValue = input.replace(regex, '').replace(/\s\s+/g, ' ').trim();
        setInput(newInputValue);
      }
    } else {
      // Use card
      setUsedCardIndices(prev => [...prev, index]);
      const textToInsert = (input.length > 0 && !input.endsWith('(') && !input.endsWith(' ') ? ' ' : '') + num;
      insertAtCursor(textToInsert);
    }
  };

  const handleOperatorClick = (op: string) => {
    if (isSolved || isDealing) return;
    const textToInsert = (input.length > 0 && !input.endsWith(' ') ? ' ' : '') + op + ' ';
    insertAtCursor(textToInsert);
  };

  const handleClear = () => {
    setInput('');
    setUsedCardIndices([]);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F0C29] via-[#302B63] to-[#24243E] text-white font-sans selection:bg-purple-500/30 relative overflow-hidden">
      {/* Decorative Background Elements - Galaxy/Fairy Tale Style */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Stars */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.2, scale: 0.5 }}
            animate={{ 
              opacity: [0.2, 0.8, 0.2], 
              scale: [0.5, 1, 0.5],
              rotate: [0, 90, 0]
            }}
            transition={{ 
              duration: 2 + Math.random() * 5, 
              repeat: Infinity, 
              delay: Math.random() * 10 
            }}
            className="absolute text-yellow-100/30"
            style={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 15 + 5}px`
            }}
          >
            ✦
          </motion.div>
        ))}

        {/* Shooting Stars */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`shooting-${i}`}
            initial={{ x: "-10%", y: "20%", opacity: 0 }}
            animate={{ 
              x: ["0%", "120%"], 
              y: ["20%", "80%"],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              delay: i * 7 + 5,
              ease: "easeOut"
            }}
            className="absolute w-32 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[-30deg] blur-[1px]"
            style={{ top: `${20 + i * 20}%`, left: "-10%" }}
          />
        ))}

        {/* Magical Moon */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] right-[10%] w-24 h-24 text-yellow-100/20 drop-shadow-[0_0_20px_rgba(253,252,240,0.3)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c.132 0 .263 0 .393.007a9 9 0 0 0 9.593 9.593A9 9 0 1 1 12 3z" />
          </svg>
        </motion.div>

        {/* Floating Clouds/Nebula */}
        <motion.div
          animate={{ x: [-20, 20, -20], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-[20%] left-[-5%] w-[40%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full"
        />
        <motion.div
          animate={{ x: [20, -20, 20], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-[10%] right-[-5%] w-[50%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"
        />

        {/* Floating Math Symbols - Whimsical Style */}
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 360] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-[40%] left-[5%] text-4xl font-fairy text-pink-300/20"
        >
          +
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -360] }}
          transition={{ duration: 18, repeat: Infinity }}
          className="absolute top-[60%] right-[8%] text-4xl font-fairy text-blue-300/20"
        >
          ×
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bottom-[15%] left-[15%] text-5xl font-fairy text-yellow-300/20"
        >
          =
        </motion.div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-md pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="bg-gradient-to-br from-white to-yellow-50 p-12 rounded-[4rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-8 border-yellow-400 flex flex-col items-center gap-6"
            >
              <div className="w-28 h-28 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <Trophy size={56} />
              </div>
              <h2 className="text-7xl font-fairy font-bold text-orange-600 text-center drop-shadow-sm">太棒了！</h2>
              <p className="text-3xl font-fairy text-orange-800/60">正在为您准备下一题...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <header className="text-center mb-12">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-6xl font-fairy font-bold tracking-wider text-yellow-200 drop-shadow-[0_4px_10px_rgba(254,240,138,0.3)] mb-2"
          >
            二十四点
          </motion.h1>
          <p className="text-blue-200/70 font-fairy text-xl">使用加减乘除，让四张牌的结果等于 24</p>
        </header>

        {/* Cards Area */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <AnimatePresence mode="popLayout">
            {cards.map((card, index) => (
              <motion.div
                key={`${card}-${index}`}
                layout
                initial={{ x: -300, y: 300, opacity: 0, rotate: -45 }}
                animate={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1, 
                  rotate: 0,
                  transition: { delay: index * 0.1, type: 'spring', stiffness: 100 }
                }}
                className="perspective-1000"
              >
                <motion.button
                  initial={false}
                  animate={{ rotateY: isDealing ? 180 : 0 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                  onClick={() => handleCardClick(card, index)}
                  disabled={isSolved || isDealing}
                  className={`w-full aspect-[2/3] relative preserve-3d transition-all duration-300 ${
                    usedCardIndices.includes(index) ? 'opacity-40 grayscale-[0.5] scale-95' : 'hover:-translate-y-2'
                  }`}
                >
                  {/* Front Side */}
                  <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.3)] border-2 border-white/50 flex flex-col items-center justify-center overflow-hidden group">
                    <div className="absolute top-3 left-3 text-2xl font-fairy font-bold text-orange-500">{card}</div>
                    <div className="text-7xl font-fairy font-bold text-[#2D3436] group-hover:text-orange-500 transition-colors drop-shadow-sm">{card}</div>
                    <div className="absolute bottom-3 right-3 text-2xl font-fairy font-bold text-orange-500 rotate-180">{card}</div>
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#FF6321_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  </div>

                  {/* Back Side */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.3)] border-2 border-white/50 flex items-center justify-center overflow-hidden">
                    <img 
                      src={cardCover} 
                      alt="Card Back"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 shadow-2xl border-2 border-white/20 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isDealing ? "正在发牌..." : "输入你的算式..."}
                disabled={isSolved || isDealing}
                className="w-full text-3xl font-fairy py-5 px-8 bg-white/5 border-2 border-white/20 rounded-[2rem] focus:outline-none focus:border-yellow-200/50 transition-all placeholder:text-white/20 text-center text-white"
              />
              {input && !isSolved && (
                <button 
                  type="button"
                  onClick={handleClear}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-yellow-200 transition-colors"
                >
                  <Delete size={24} />
                </button>
              )}
            </div>

            {/* Quick Operators */}
            <div className="flex flex-wrap justify-center gap-4">
              {['+', '-', '*', '/', '(', ')'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => handleOperatorClick(op)}
                  disabled={isSolved || isDealing}
                  className="w-14 h-14 flex items-center justify-center bg-white/5 border-2 border-white/10 rounded-2xl font-fairy text-2xl text-white hover:bg-white/10 hover:border-yellow-200/30 hover:text-yellow-200 transition-all disabled:opacity-30"
                >
                  {op === '*' ? '×' : op === '/' ? '÷' : op}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSolved || isDealing || !input.trim()}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-5 rounded-[2rem] font-fairy text-2xl shadow-[0_8px_0_0_#B45309] hover:translate-y-[2px] hover:shadow-[0_6px_0_0_#B45309] active:translate-y-[8px] active:shadow-none transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3"
              >
                <Play size={24} fill="currentColor" />
                提交答案
              </button>
              
              <button
                type="button"
                onClick={startNewGame}
                disabled={isDealing}
                className="p-5 bg-white/5 border-2 border-white/10 rounded-[2rem] text-white/60 hover:border-yellow-200/30 hover:text-yellow-200 transition-all flex items-center justify-center disabled:opacity-30"
                title="换一组牌"
              >
                <RefreshCw size={28} className={isSolved ? "animate-pulse" : ""} />
              </button>
            </div>
          </form>

          {/* Feedback Message */}
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 p-5 rounded-[2rem] flex items-center gap-3 font-fairy text-xl border-2 ${
                  message.type === 'success' ? 'bg-green-500/20 text-green-200 border-green-500/30' :
                  message.type === 'error' ? 'bg-red-500/20 text-red-200 border-red-500/30' :
                  'bg-blue-500/20 text-blue-200 border-blue-500/30'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={24} /> : 
                 message.type === 'error' ? <AlertCircle size={24} /> : 
                 <Info size={24} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint Area */}
          {hint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-6 bg-yellow-400/20 border-2 border-yellow-400/30 rounded-[2rem] shadow-[0_0_20px_rgba(250,204,21,0.1)]"
            >
              <div className="flex items-center gap-2 text-yellow-300 font-fairy text-2xl mb-2">
                <HelpCircle size={24} />
                <span>提示解法:</span>
              </div>
              <code className="text-3xl font-mono text-yellow-50 font-bold tracking-wider">{hint}</code>
            </motion.div>
          )}
        </div>

        {/* Instructions */}
        <footer className="text-center space-y-6">
          <div className="flex justify-center gap-8">
            <button 
              onClick={handleGiveUp}
              disabled={isSolved || isDealing}
              className="text-blue-200/50 hover:text-yellow-200 font-fairy text-xl flex items-center gap-2 transition-colors disabled:opacity-20"
            >
              <HelpCircle size={22} />
              我不会，公布答案
            </button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-[2.5rem] text-blue-100/70 font-fairy text-lg leading-relaxed border border-white/10">
            <h3 className="font-bold text-yellow-100 mb-3 flex items-center justify-center gap-2">
              <Info size={18} /> 游戏规则
            </h3>
            <ul className="space-y-2">
              <li>• 使用给出的 4 张牌，每张牌必须使用且只能使用一次。</li>
              <li>• 可以使用加(+)、减(-)、乘(*)、除(/)和括号()。</li>
              <li>• 最终计算结果必须等于 24。</li>
            </ul>
          </div>
        </footer>
      </div>

    </div>
  );
}
