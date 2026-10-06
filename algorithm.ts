export type DFA = {
  states: string[];
  alphabet: string[];
  transitions: Record<string, Record<string, string>>;
  startState: string;
  finalStates: string[];
};

export type Block = string[];

export type Step = {
  action: 'INIT' | 'PROCESS' | 'DONE';
  partition: Block[];
  worklist: Block[];
  splits: Array<{ before: Block; after: Block[]; symbol?: string }>;
  symbol?: string;
  splitter?: string[];
  X?: string[];
  text: string;
};

export type Result = {
  reachable: string[];
  unreachable: string[];
  partition: Block[];
  names: Record<string, Block>;
  mapping: Record<string, string>;
  min: DFA;
  steps: Step[];
};

const normalizeBlock = (value: string[]) => [...value].sort();
const blockKey = (value: string[]) => normalizeBlock(value).join('|');
const equalBlocks = (a: string[], b: string[]) => blockKey(a) === blockKey(b);

const canonicalName = (index: number) => String.fromCharCode(65 + index);

export const EXAMPLES: Record<string, DFA> = {
  'Multi-step refinement': {
    states: ['A', 'B', 'C', 'D', 'E', 'F'],
    alphabet: ['0', '1'],
    transitions: {
      A: { '0': 'B', '1': 'C' },
      B: { '0': 'D', '1': 'E' },
      C: { '0': 'F', '1': 'E' },
      D: { '0': 'D', '1': 'E' },
      E: { '0': 'E', '1': 'E' },
      F: { '0': 'F', '1': 'E' },
    },
    startState: 'A',
    finalStates: ['D', 'F'],
  },
  'Even parity': {
    states: ['q0', 'q1'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { '0': 'q0', '1': 'q1' },
      q1: { '0': 'q1', '1': 'q0' },
    },
    startState: 'q0',
    finalStates: ['q0'],
  },
};

export function findReachable(dfa: DFA): string[] {
  const seen = new Set<string>([dfa.startState]);
  const queue = [dfa.startState];

  while (queue.length) {
    const state = queue.pop()!;
    for (const symbol of dfa.alphabet) {
      const next = dfa.transitions[state]?.[symbol];
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return [...seen];
}

export function validateDFA(dfa: unknown): string[] {
  const errors: string[] = [];

  if (!dfa || typeof dfa !== 'object') {
    return ['DFA definition must be an object.'];
  }

  const value = dfa as Record<string, unknown>;
  const states = Array.isArray(value.states) ? value.states : [];
  const alphabet = Array.isArray(value.alphabet) ? value.alphabet : [];
  const transitions = value.transitions && typeof value.transitions === 'object' ? value.transitions as Record<string, Record<string, unknown>> : {};

  if (!states.length) {
    errors.push('DFA must contain at least one state.');
  }

  const duplicateStates = states.filter((state, index) => states.indexOf(state) !== index);
  if (duplicateStates.length) {
    errors.push('State names must be unique.');
  }

  if (!alphabet.length) {
    errors.push('DFA alphabet cannot be empty.');
  }

  const duplicateSymbols = alphabet.filter((symbol, index) => alphabet.indexOf(symbol) !== index);
  if (duplicateSymbols.length) {
    errors.push('Alphabet symbols must be unique.');
  }

  if (typeof value.startState !== 'string' || !states.includes(value.startState as string)) {
    errors.push('Start state must be one of the defined states.');
  }

  if (!Array.isArray(value.finalStates)) {
    errors.push('Final state list is required.');
  } else {
    const invalidFinals = value.finalStates.filter((state) => typeof state !== 'string' || !states.includes(state));
    if (invalidFinals.length) {
      errors.push('Final states must be valid state names.');
    }
  }

  for (const state of states) {
    const row = transitions[state];
    if (!row || typeof row !== 'object') {
      errors.push(`State ${state} is missing a transition row.`);
      continue;
    }

    for (const symbol of alphabet) {
      const target = row[symbol];
      if (typeof target !== 'string' || !states.includes(target)) {
        errors.push(`State ${state} has an invalid transition on symbol ${symbol}.`);
      }
    }
  }

  return errors;
}

export function minimize(dfa: DFA): Result {
  const errors = validateDFA(dfa);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  const reachable = findReachable(dfa);
  const unreachable = dfa.states.filter((state) => !reachable.includes(state));
  const liveStates = reachable;
  const liveFinals = liveStates.filter((state) => dfa.finalStates.includes(state));
  const liveNonFinals = liveStates.filter((state) => !dfa.finalStates.includes(state));

  let partition: Block[] = [liveFinals, liveNonFinals].filter((block) => block.length > 0).map(normalizeBlock);
  let worklist: Block[] = [...partition].sort((a, b) => a.length - b.length);

  const steps: Step[] = [
    {
      action: 'INIT',
      partition: partition.map((block) => [...block]),
      worklist: worklist.map((block) => [...block]),
      splits: [],
      text: 'Initialize the partition by separating accepting and non-accepting states.',
    },
  ];

  while (worklist.length) {
    const splitter = worklist.shift()!;
    const predecessors = new Set<string>();

    for (const state of liveStates) {
      for (const symbol of dfa.alphabet) {
        const next = dfa.transitions[state]?.[symbol];
        if (next && splitter.includes(next)) {
          predecessors.add(state);
        }
      }
    }

    const X = [...predecessors].sort();
    const splitChanges: Array<{ before: Block; after: Block[]; symbol?: string }> = [];
    let chosenSymbol: string | undefined;

    for (const block of partition) {
      const intersection = block.filter((state) => X.includes(state));
      const remainder = block.filter((state) => !X.includes(state));
      if (intersection.length > 0 && remainder.length > 0) {
        splitChanges.push({ before: [...block], after: [intersection, remainder] });
        if (!chosenSymbol) {
          const symbol = dfa.alphabet.find((value) => {
            const first = block.filter((state) => dfa.transitions[state]?.[value] && splitter.includes(dfa.transitions[state][value]));
            return first.length > 0 && first.length < block.length;
          });
          chosenSymbol = symbol;
        }
      }
    }

    const currentPartition = partition.map((block) => [...block]);
    const currentWorklist = worklist.map((block) => [...block]);

    if (splitChanges.length > 0) {
      const nextPartition: Block[] = [];
      for (const block of partition) {
        const match = splitChanges.find((entry) => equalBlocks(entry.before, block));
        if (match) {
          nextPartition.push(...match.after.map(normalizeBlock));
        } else {
          nextPartition.push([...block]);
        }
      }

      partition = nextPartition.map(normalizeBlock);

      const newBlocks = splitChanges.flatMap((entry) => entry.after).map(normalizeBlock);
      const queued = [...worklist];
      for (const block of newBlocks) {
        if (!queued.some((item) => equalBlocks(item, block))) {
          queued.push(block);
        }
      }
      worklist = queued.sort((a, b) => a.length - b.length);

      steps.push({
        action: 'PROCESS',
        partition: currentPartition,
        worklist: currentWorklist,
        splits: splitChanges,
        symbol: chosenSymbol,
        splitter: [...splitter],
        X,
        text: `Split ${splitter.join(', ')} on ${chosenSymbol ?? 'one of the symbols'}; the predecessor set X is ${X.length ? X.join(', ') : 'empty'}.`,
      });
    } else {
      steps.push({
        action: 'PROCESS',
        partition: currentPartition,
        worklist: currentWorklist,
        splits: [],
        symbol: undefined,
        splitter: [...splitter],
        X,
        text: `No block split occurs for splitter ${splitter.join(', ')}, so the partition remains stable.`,
      });
    }
  }

  const finalPartition = partition.map(normalizeBlock);
  const names: Record<string, Block> = {};
  finalPartition.forEach((block, index) => {
    names[canonicalName(index)] = [...block];
  });

  const mapping: Record<string, string> = {};
  for (const [name, block] of Object.entries(names)) {
    for (const state of block) {
      mapping[state] = name;
    }
  }

  const minStates = Object.keys(names);
  const minTransitions: Record<string, Record<string, string>> = {};

  for (const state of minStates) {
    const representative = names[state][0];
    minTransitions[state] = {};
    for (const symbol of dfa.alphabet) {
      const nextState = dfa.transitions[representative]?.[symbol];
      minTransitions[state][symbol] = nextState ? mapping[nextState] : nextState;
    }
  }

  const minDfa: DFA = {
    states: minStates,
    alphabet: [...dfa.alphabet],
    transitions: minTransitions,
    startState: mapping[dfa.startState],
    finalStates: dfa.finalStates.filter((state) => reachable.includes(state)).map((state) => mapping[state]),
  };

  steps.push({
    action: 'DONE',
    partition: finalPartition,
    worklist: [],
    splits: [],
    text: 'The partition is stable, so each block becomes a single minimized DFA state.',
  });

  return {
    reachable,
    unreachable,
    partition: finalPartition,
    names,
    mapping,
    min: minDfa,
    steps,
  };
}

export function verify(dfa: DFA, result: Result): string[] {
  const errors: string[] = [];
  const reachableSet = new Set(result.reachable);

  for (const state of dfa.states) {
    if (!reachableSet.has(state)) continue;
    const mappedState = result.mapping[state];
    if (!mappedState || !result.min.states.includes(mappedState)) {
      errors.push(`State ${state} is missing from the minimized DFA mapping.`);
      continue;
    }

    const expectedFinal = dfa.finalStates.includes(state);
    const actualFinal = result.min.finalStates.includes(mappedState);
    if (expectedFinal !== actualFinal) {
      errors.push(`Final-state mismatch for ${state}.`);
    }

    for (const symbol of dfa.alphabet) {
      const expectedTarget = result.mapping[dfa.transitions[state][symbol]];
      const actualTarget = result.min.transitions[mappedState][symbol];
      if (expectedTarget !== actualTarget) {
        errors.push(`Transition mismatch for state ${state} on ${symbol}.`);
      }
    }
  }

  return errors;
}
