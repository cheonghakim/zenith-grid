import { describe, expect, it, beforeEach } from 'vitest';
import { PaginationManager } from '../src/managers/PaginationManager.js';

describe('PaginationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new PaginationManager({ pageSize: 20 });
  });

  describe('initial state', () => {
    it('starts on page 0', () => {
      expect(manager.getState().page).toBe(0);
    });

    it('uses the configured pageSize', () => {
      expect(manager.getState().pageSize).toBe(20);
    });
  });

  describe('setTotalCount / getTotalPages', () => {
    it('calculates correct totalPages', () => {
      manager.setTotalCount(100);
      expect(manager.getTotalPages()).toBe(5);
    });

    it('rounds up for partial last page', () => {
      manager.setTotalCount(55);
      expect(manager.getTotalPages()).toBe(3);
    });

    it('returns 1 when there are no rows', () => {
      manager.setTotalCount(0);
      expect(manager.getTotalPages()).toBe(1);
    });
  });

  describe('setPage / nextPage / prevPage / firstPage / lastPage', () => {
    beforeEach(() => {
      manager.setTotalCount(100);
    });

    it('setPage navigates to specific page', () => {
      manager.setPage(2);
      expect(manager.getState().page).toBe(2);
    });

    it('nextPage increments page', () => {
      manager.nextPage();
      expect(manager.getState().page).toBe(1);
    });

    it('prevPage decrements page', () => {
      manager.setPage(3);
      manager.prevPage();
      expect(manager.getState().page).toBe(2);
    });

    it('nextPage does not exceed last page', () => {
      manager.setPage(4); // last page (0-based) for 100 rows / 20 per page
      manager.nextPage();
      expect(manager.getState().page).toBe(4);
    });

    it('prevPage does not go below 0', () => {
      manager.prevPage();
      expect(manager.getState().page).toBe(0);
    });

    it('firstPage navigates to page 0', () => {
      manager.setPage(3);
      manager.firstPage();
      expect(manager.getState().page).toBe(0);
    });

    it('lastPage navigates to the last page', () => {
      manager.lastPage();
      expect(manager.getState().page).toBe(4);
    });
  });

  describe('setPageSize', () => {
    it('changes page size and keeps the first visible row on screen', () => {
      // page=3, pageSize=20 → firstVisible=60 → newPage = floor(60/50) = 1
      manager.setTotalCount(100);
      manager.setPage(3);
      manager.setPageSize(50);
      expect(manager.getState().pageSize).toBe(50);
      expect(manager.getState().page).toBe(1);
    });
  });

  describe('getSliceRange', () => {
    it('returns correct start/end for page 0', () => {
      manager.setTotalCount(100);
      const { start, end } = manager.getSliceRange();
      expect(start).toBe(0);
      expect(end).toBe(20);
    });

    it('returns correct start/end for page 2', () => {
      manager.setTotalCount(100);
      manager.setPage(2);
      const { start, end } = manager.getSliceRange();
      expect(start).toBe(40);
      expect(end).toBe(60);
    });

    it('returns start/end for the last page without capping (consumers apply the cap via totalCount)', () => {
      // getSliceRange returns a raw window; the actual data slice is capped by the consumer
      manager.setTotalCount(55);
      manager.setPage(2);
      const { start, end } = manager.getSliceRange();
      expect(start).toBe(40);
      expect(end).toBe(60); // raw window end, not capped at 55
    });
  });

  describe('getState – boundary flags', () => {
    it('isFirst is true on page 0', () => {
      manager.setTotalCount(100);
      expect(manager.getState().isFirst).toBe(true);
    });

    it('isLast is true on the last page', () => {
      manager.setTotalCount(100);
      manager.lastPage();
      expect(manager.getState().isLast).toBe(true);
    });

    it('startRow is 1-indexed and endRow is the last row number of the page', () => {
      // page=1, pageSize=20 → startRow = 1*20+1 = 21 (1-based), endRow = min(40, 55) = 40
      manager.setTotalCount(55);
      manager.setPage(1);
      const state = manager.getState();
      expect(state.startRow).toBe(21);
      expect(state.endRow).toBe(40);
    });
  });

  describe('mode (client / server)', () => {
    it('defaults to client mode', () => {
      expect(manager.getMode()).toBe('client');
    });

    it('setMode changes the mode', () => {
      manager.setMode('server');
      expect(manager.getMode()).toBe('server');
    });
  });

  describe('incrementTotalCount', () => {
    it('adds a delta to totalCount', () => {
      manager.setTotalCount(50);
      manager.incrementTotalCount(10);
      expect(manager.getState().totalCount).toBe(60);
    });
  });
});
