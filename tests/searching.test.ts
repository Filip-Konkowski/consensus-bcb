import { binarySearch, linearSearch, findKthLargest } from '../src/algorithms/searching';

describe('Searching Algorithms', () => {
  const sortedArray = [1, 3, 5, 7, 9, 11, 13, 15];

  test('binarySearch should find existing element', () => {
    expect(binarySearch(sortedArray, 7)).toBe(3);
    expect(binarySearch(sortedArray, 1)).toBe(0);
    expect(binarySearch(sortedArray, 15)).toBe(7);
  });

  test('binarySearch should return -1 for non-existing element', () => {
    expect(binarySearch(sortedArray, 6)).toBe(-1);
    expect(binarySearch(sortedArray, 16)).toBe(-1);
  });

  test('linearSearch should find existing element', () => {
    expect(linearSearch(sortedArray, 7)).toBe(3);
    expect(linearSearch(sortedArray, 1)).toBe(0);
  });

  test('linearSearch should return -1 for non-existing element', () => {
    expect(linearSearch(sortedArray, 6)).toBe(-1);
  });

  test('findKthLargest should return correct element', () => {
    const nums = [3, 2, 1, 5, 6, 4];
    expect(findKthLargest(nums, 2)).toBe(5);
    expect(findKthLargest(nums, 4)).toBe(3);
  });
});
