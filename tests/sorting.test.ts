import { bubbleSort, quickSort, mergeSort } from '../src/algorithms/sorting';

describe('Sorting Algorithms', () => {
  const unsorted = [64, 34, 25, 12, 22, 11, 90];
  const expected = [11, 12, 22, 25, 34, 64, 90];

  test('bubbleSort should sort array correctly', () => {
    expect(bubbleSort(unsorted)).toEqual(expected);
  });

  test('quickSort should sort array correctly', () => {
    expect(quickSort(unsorted)).toEqual(expected);
  });

  test('mergeSort should sort array correctly', () => {
    expect(mergeSort(unsorted)).toEqual(expected);
  });

  test('should handle empty array', () => {
    expect(bubbleSort([])).toEqual([]);
    expect(quickSort([])).toEqual([]);
    expect(mergeSort([])).toEqual([]);
  });

  test('should handle single element array', () => {
    expect(bubbleSort([1])).toEqual([1]);
    expect(quickSort([1])).toEqual([1]);
    expect(mergeSort([1])).toEqual([1]);
  });
});
