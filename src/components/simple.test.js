// Simple test to verify Jest setup
describe('Jest Setup Test', () => {
  test('basic test works', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('mock functions work', () => {
    const mockFn = jest.fn();
    mockFn();
    expect(mockFn).toHaveBeenCalled();
  });
});