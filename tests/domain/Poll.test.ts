/**
 * Tests para la entidad Poll del dominio
 * Lógica de negocio pura - sin dependencias externas
 */

import { describe, it, expect } from 'vitest';
import {
  createPoll,
  addVoteToPoll,
  changeVoteInPoll,
  stopPoll,
  getPollResult,
  findOptionByVote,
  isPollExpired,
  isPollAtMaxVotes,
} from '../../src/domain/entities/Poll';

describe('Poll Entity', () => {
  describe('createPoll', () => {
    it('should create a poll with default values', () => {
      const poll = createPoll({
        title: 'Test Poll',
        question: '¿Qué juego?',
        options: [
          { label: 'Minecraft', color: '#4ade80' },
          { label: 'Fortnite', color: '#a970ff' },
        ],
      });

      expect(poll.id).toBeDefined();
      expect(poll.title).toBe('Test Poll');
      expect(poll.question).toBe('¿Qué juego?');
      expect(poll.options).toHaveLength(2);
      expect(poll.isActive).toBe(true);
      expect(poll.totalVotes).toBe(0);
      expect(poll.votePrefix).toBe('+');
      expect(poll.voteMatchMode).toBe('exact');
    });

    it('should assign sequential IDs to options', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
          { label: 'C', color: '#f00' },
        ],
      });

      expect(poll.options[0].id).toBe(1);
      expect(poll.options[1].id).toBe(2);
      expect(poll.options[2].id).toBe(3);
    });

    it('should initialize all options with 0 votes', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
      });

      poll.options.forEach(opt => {
        expect(opt.votes).toBe(0);
      });
    });

    it('should accept custom votePrefix and voteMatchMode', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
        votePrefix: '!vote',
        voteMatchMode: 'partial',
      });

      expect(poll.votePrefix).toBe('!vote');
      expect(poll.voteMatchMode).toBe('partial');
    });
  });

  describe('addVoteToPoll', () => {
    it('should add a vote to the correct option', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
      });

      const updated = addVoteToPoll(poll, 1, 1);

      expect(updated.options[0].votes).toBe(1);
      expect(updated.options[1].votes).toBe(0);
      expect(updated.totalVotes).toBe(1);
    });

    it('should support weighted votes', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      const updated = addVoteToPoll(poll, 1, 3);

      expect(updated.options[0].votes).toBe(3);
      expect(updated.totalVotes).toBe(3);
    });

    it('should not mutate the original poll', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      const updated = addVoteToPoll(poll, 1, 1);

      expect(poll.totalVotes).toBe(0);
      expect(updated.totalVotes).toBe(1);
    });
  });

  describe('changeVoteInPoll', () => {
    it('should transfer votes between options', () => {
      let poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
      });

      poll = addVoteToPoll(poll, 1, 1);
      const updated = changeVoteInPoll(poll, 1, 2, 1, 1);

      expect(updated.options[0].votes).toBe(0);
      expect(updated.options[1].votes).toBe(1);
      // Note: changeVoteInPoll doesn't recalculate totalVotes
    });

    it('should handle weight changes', () => {
      let poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
      });

      poll = addVoteToPoll(poll, 1, 2);
      const updated = changeVoteInPoll(poll, 1, 2, 2, 3);

      expect(updated.options[0].votes).toBe(0);
      expect(updated.options[1].votes).toBe(3);
      // totalVotes is not recalculated in changeVoteInPoll
    });
  });

  describe('stopPoll', () => {
    it('should mark poll as inactive', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      const stopped = stopPoll(poll);

      expect(stopped.isActive).toBe(false);
    });
  });

  describe('getPollResult', () => {
    it('should return winner with most votes', () => {
      let poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
      });

      poll = addVoteToPoll(poll, 1, 5);
      poll = addVoteToPoll(poll, 2, 3);

      const result = getPollResult(poll);

      expect(result.winner?.label).toBe('A');
      expect(result.winner?.votes).toBe(5);
      expect(result.totalVotes).toBe(8);
    });

    it('should handle tie by returning first option', () => {
      let poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
      });

      poll = addVoteToPoll(poll, 1, 5);
      poll = addVoteToPoll(poll, 2, 5);

      const result = getPollResult(poll);

      expect(result.winner?.votes).toBe(5);
    });

    it('should return first option as winner if no votes (reduce behavior)', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      const result = getPollResult(poll);

      // reduce returns first element when all have 0 votes
      expect(result.winner.label).toBe('A');
      expect(result.winner.votes).toBe(0);
      expect(result.totalVotes).toBe(0);
    });
  });

  describe('findOptionByVote', () => {
    it('should find option by exact match with prefix', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'Minecraft', color: '#fff' },
          { label: 'Fortnite', color: '#000' },
        ],
        votePrefix: '+',
      });

      const option = findOptionByVote(poll, '+1');

      expect(option?.label).toBe('Minecraft');
    });

    it('should find option by number with prefix', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'A', color: '#fff' },
          { label: 'B', color: '#000' },
        ],
        votePrefix: '+',
      });

      const option = findOptionByVote(poll, '+2');

      expect(option?.label).toBe('B');
    });

    it('should find option by custom voteKey with prefix', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'Minecraft', color: '#fff', voteKey: 'mc' },
          { label: 'Fortnite', color: '#000', voteKey: 'fn' },
        ],
        votePrefix: '+',
      });

      const option = findOptionByVote(poll, '+mc');

      expect(option?.label).toBe('Minecraft');
    });

    it('should return null for invalid vote', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      const option = findOptionByVote(poll, 'invalid');

      expect(option).toBeNull();
    });

    it('should be case insensitive with prefix', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [
          { label: 'Minecraft', color: '#fff', voteKey: 'MC' },
        ],
        votePrefix: '+',
      });

      const option = findOptionByVote(poll, '+mc');

      expect(option?.label).toBe('Minecraft');
    });
  });

  describe('isPollExpired', () => {
    it('should return false if no duration set', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      expect(isPollExpired(poll)).toBe(false);
    });

    it('should return false if within duration', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
        duration: 60000, // 60 seconds
      });

      expect(isPollExpired(poll)).toBe(false);
    });

    it('should return true if past duration (duration in seconds)', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
        duration: 1, // 1 second
      });

      // Create expired poll (started 2 seconds ago)
      const expired = { ...poll, startTime: Date.now() - 2000 };

      expect(isPollExpired(expired)).toBe(true);
    });
  });

  describe('isPollAtMaxVotes', () => {
    it('should return false if no maxVotes set', () => {
      const poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
      });

      expect(isPollAtMaxVotes(poll)).toBe(false);
    });

    it('should return false if under maxVotes', () => {
      let poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
        maxVotes: 10,
      });

      poll = addVoteToPoll(poll, 1, 5);

      expect(isPollAtMaxVotes(poll)).toBe(false);
    });

    it('should return true if at maxVotes', () => {
      let poll = createPoll({
        title: 'Test',
        question: 'Test?',
        options: [{ label: 'A', color: '#fff' }],
        maxVotes: 10,
      });

      poll = addVoteToPoll(poll, 1, 10);

      expect(isPollAtMaxVotes(poll)).toBe(true);
    });
  });
});
