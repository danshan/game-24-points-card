/**
 * 24 Points Game Logic
 */

export type CardValue = number;

/**
 * Generates 4 random cards from 1 to 10.
 */
export function generateCards(): CardValue[] {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10) + 1);
}

/**
 * Safely evaluates a mathematical expression.
 * Only supports +, -, *, /, (, ) and numbers.
 */
export function evaluateExpression(expr: string): number | null {
  // Basic sanitization: only allow digits, operators, and parentheses
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
    return null;
  }

  try {
    // Using Function as a "safe" eval for this restricted input
    // In a production app with user-provided scripts, we'd use a proper parser.
    const result = new Function(`return (${expr})`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * Validates if the expression uses each card exactly once.
 */
export function validateCardUsage(expr: string, cards: CardValue[]): boolean {
  // Extract all numbers from the expression
  const usedNumbers = expr.match(/\d+/g)?.map(Number) || [];
  
  if (usedNumbers.length !== cards.length) {
    return false;
  }

  const sortedUsed = [...usedNumbers].sort((a, b) => a - b);
  const sortedCards = [...cards].sort((a, b) => a - b);

  return sortedUsed.every((val, index) => val === sortedCards[index]);
}

/**
 * Solver for 24 points game.
 * Returns a solution string if one exists, otherwise null.
 */
export function solve24(cards: number[]): string | null {
  const ops = ['+', '-', '*', '/'];
  
  function backtrack(nums: { val: number; expr: string }[]): string | null {
    if (nums.length === 1) {
      if (Math.abs(nums[0].val - 24) < 1e-6) {
        return nums[0].expr;
      }
      return null;
    }

    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;

        const remaining = nums.filter((_, idx) => idx !== i && idx !== j);
        const a = nums[i];
        const b = nums[j];

        for (const op of ops) {
          // Avoid redundant operations for + and *
          if ((op === '+' || op === '*') && i > j) continue;
          
          // Division by zero
          if (op === '/' && Math.abs(b.val) < 1e-6) continue;

          let newVal: number;
          let newExpr: string;

          switch (op) {
            case '+': newVal = a.val + b.val; newExpr = `(${a.expr}+${b.expr})`; break;
            case '-': newVal = a.val - b.val; newExpr = `(${a.expr}-${b.expr})`; break;
            case '*': newVal = a.val * b.val; newExpr = `(${a.expr}*${b.expr})`; break;
            case '/': newVal = a.val / b.val; newExpr = `(${a.expr}/${b.expr})`; break;
            default: continue;
          }

          const res = backtrack([...remaining, { val: newVal, expr: newExpr }]);
          if (res) return res;
        }
      }
    }
    return null;
  }

  return backtrack(cards.map(n => ({ val: n, expr: n.toString() })));
}
