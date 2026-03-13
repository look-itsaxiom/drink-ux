import '@testing-library/jest-dom';

// Make requestAnimationFrame synchronous in tests so layer visibility triggers immediately
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  cb(0);
  return 0;
};
globalThis.cancelAnimationFrame = (_id: number): void => {};
