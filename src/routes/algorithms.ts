import express, { Request, Response } from 'express';

const router = express.Router();

// Example algorithm: Two Sum
router.post('/two-sum', (req: Request, res: Response): void => {
  try {
    const { nums, target } = req.body;
    
    if (!nums || !Array.isArray(nums) || typeof target !== 'number') {
      res.status(400).json({ 
        error: 'Invalid input. Expected nums (array) and target (number)' 
      });
      return;
    }

    const result = twoSum(nums, target);
    res.json({ 
      input: { nums, target }, 
      result,
      algorithm: 'Two Sum'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example algorithm: Fibonacci
router.get('/fibonacci/:n', (req: Request, res: Response): void => {
  try {
    const n = parseInt(req.params.n);
    
    if (isNaN(n) || n < 0) {
      res.status(400).json({ 
        error: 'Invalid input. Expected non-negative integer' 
      });
      return;
    }

    const result = fibonacci(n);
    res.json({ 
      input: n, 
      result,
      algorithm: 'Fibonacci'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List available algorithms
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Available algorithms',
    algorithms: [
      {
        name: 'Two Sum',
        endpoint: 'POST /api/algorithms/two-sum',
        description: 'Find two numbers that add up to target'
      },
      {
        name: 'Fibonacci',
        endpoint: 'GET /api/algorithms/fibonacci/:n',
        description: 'Calculate nth Fibonacci number'
      }
    ]
  });
});

// Algorithm implementations
function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  
  return [];
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  
  return b;
}

export { router as algorithmRoutes };
