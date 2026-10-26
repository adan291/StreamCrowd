import { describe, it, expect } from 'vitest';
import { parseChatPollCommands, matchVoteOption } from '../../src/application/utils/chatPollCommands';

const options = [
  { id: 1, label: 'Rojo', votes: 0, color: '#f00', voteKey: 'rojo' },
  { id: 2, label: 'Azul', votes: 0, color: '#00f', voteKey: 'azul' },
];

describe('parseChatPollCommands', () => {
  it('creates a poll from !poll for mods/broadcaster only', () => {
    expect(parseChatPollCommands('!poll ¿Color? | Rojo | Azul', true, false, false)).toEqual([
      { type: 'create', question: '¿Color?', options: [{ label: 'Rojo', color: '#a970ff' }, { label: 'Azul', color: '#00f0f0' }] },
    ]);
    expect(parseChatPollCommands('!poll ¿Color? | Rojo | Azul', false, false, false)).toEqual([]);
  });

  it('needs a question and at least two options', () => {
    expect(parseChatPollCommands('!poll ¿Color? | Rojo', true, false, false)).toEqual([]);
  });

  it('!endpoll only ends an active poll; !resetpoll always resets (mods)', () => {
    expect(parseChatPollCommands('!endpoll', true, true, true)).toEqual([{ type: 'end' }]);
    expect(parseChatPollCommands('!endpoll', true, false, true)).toEqual([]);
    expect(parseChatPollCommands('!resetpoll', true, false, false)).toEqual([{ type: 'reset' }]);
    expect(parseChatPollCommands('!resetpoll', false, false, false)).toEqual([]);
  });

  it('accepts panel sync commands from anyone', () => {
    expect(parseChatPollCommands('!pollend', false, true, true)).toEqual([{ type: 'end' }]);
    expect(parseChatPollCommands('!pollsync Q | A | B', false, false, false)[0].type).toBe('create');
  });
});

describe('matchVoteOption', () => {
  it('matches numbers and vote keys with the default prefix', () => {
    expect(matchVoteOption('+2', { options })).toBe(2);
    expect(matchVoteOption('  +ROJO ', { options })).toBe(1);
    expect(matchVoteOption('+verde', { options })).toBeNull();
    expect(matchVoteOption('hola +1', { options })).toBeNull();
  });

  it('escapes custom prefixes used as regex characters', () => {
    expect(matchVoteOption('#azul', { options, votePrefix: '#' })).toBe(2);
    expect(matchVoteOption('.1', { options, votePrefix: '.' })).toBe(1);
    expect(matchVoteOption('x1', { options, votePrefix: '.' })).toBeNull();
  });

  it('partial mode matches contained keys and keys inside the message', () => {
    expect(matchVoteOption('+rojito', { options, voteMatchMode: 'partial' })).toBeNull();
    expect(matchVoteOption('+rojooo', { options, voteMatchMode: 'partial' })).toBe(1);
    expect(matchVoteOption('voto +azul claro', { options, voteMatchMode: 'partial' })).toBe(2);
    expect(matchVoteOption('voto +azul claro', { options })).toBeNull();
  });
});
