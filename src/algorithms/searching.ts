/**
 * Common search algorithms
 */

export function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}

export function linearSearch(arr: number[], target: number): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}

export function findKthLargest(nums: number[], k: number): number {
  const sorted = nums.sort((a, b) => b - a);
  return sorted[k - 1];
}

export function findPeakElement(nums: number[]): number {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    
    if (nums[mid] > nums[mid + 1]) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}
