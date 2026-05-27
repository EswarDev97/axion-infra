'use strict';

const { EXIT_CODES, createResult, exitWithResult } = require('../lib/exit-codes');

describe('EXIT_CODES constants', () => {
  it('SUCCESS is 0', () => expect(EXIT_CODES.SUCCESS).toBe(0));
  it('WARNING is 1', () => expect(EXIT_CODES.WARNING).toBe(1));
  it('BLOCK is 2',   () => expect(EXIT_CODES.BLOCK).toBe(2));

  it('has exactly three codes', () => {
    expect(Object.keys(EXIT_CODES)).toHaveLength(3);
  });
});

describe('createResult()', () => {
  it('returns success=true when success flag is set', () => {
    const r = createResult({ success: true });
    expect(r.success).toBe(true);
  });

  it('returns success=false when success flag is false', () => {
    const r = createResult({ success: false });
    expect(r.success).toBe(false);
  });

  it('passes through message', () => {
    const r = createResult({ success: true, message: 'ok' });
    expect(r.message).toBe('ok');
  });

  it('defaults errors and warnings to empty arrays', () => {
    const r = createResult({ success: true });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('accepts errors and warnings arrays', () => {
    const r = createResult({
      success: false,
      errors: [{ message: 'bad' }],
      warnings: [{ message: 'hmm' }],
    });
    expect(r.errors).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
  });

  it('sets blocking=true when blocking option is true', () => {
    const r = createResult({ success: false, blocking: true });
    expect(r.blocking).toBe(true);
  });

  it('sets blocking=true when any error has blocking:true', () => {
    const r = createResult({
      success: false,
      errors: [{ blocking: true, message: 'oops' }],
    });
    expect(r.blocking).toBe(true);
  });

  it('blocking stays false when no blocking errors', () => {
    const r = createResult({
      success: false,
      errors: [{ blocking: false, message: 'minor' }],
    });
    expect(r.blocking).toBe(false);
  });
});

describe('exitWithResult()', () => {
  let mockExit;

  beforeEach(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  it('calls process.exit(0) on success', () => {
    exitWithResult({ success: true });
    expect(mockExit).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
  });

  it('calls process.exit(2) on blocking failure', () => {
    exitWithResult({ success: false, blocking: true });
    expect(mockExit).toHaveBeenCalledWith(EXIT_CODES.BLOCK);
  });

  it('calls process.exit(2) on critical failure', () => {
    exitWithResult({ success: false, critical: true });
    expect(mockExit).toHaveBeenCalledWith(EXIT_CODES.BLOCK);
  });

  it('calls process.exit(1) on non-blocking failure', () => {
    exitWithResult({ success: false });
    expect(mockExit).toHaveBeenCalledWith(EXIT_CODES.WARNING);
  });
});
