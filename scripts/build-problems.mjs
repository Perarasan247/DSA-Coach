// Build src/data/problems.json from a structured roadmap.
// Run with: node scripts/build-problems.mjs
//
// ID stability: if problems.json already exists, problems with the same
// (topic, title) keep their existing id. New problems get fresh ids past the
// current max. This means edits to the catalog don't shuffle existing
// progress in the user's IndexedDB.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'src', 'data', 'problems.json');

// LeetCode slug convention (lossy — a handful may 404 and that's OK; url is optional).
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’′']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const url = (title) => `https://leetcode.com/problems/${slug(title)}/`;

/**
 * Each topic block has easy/medium/hard arrays. Repeats across topics are
 * intentional — the spec says "keep intentional repeats as separate rows."
 */
const catalog = [
  {
    topic: 'Matrix',
    // These are practice exercises, not all on LeetCode; skip URL generation
    // to avoid linking users to 404 pages.
    noUrl: true,
    easy: [
      'Print matrix row by row',
      'Print matrix column by column',
      'Find sum of all elements in matrix',
      'Find largest/smallest element in matrix',
      'Search an element in matrix',
      'Count positive, negative, and zero elements',
      'Print diagonal elements of a matrix',
      'Sum of diagonal elements',
      'Add two matrices',
    ],
    medium: [
      'Spiral order traversal of matrix',
      'Zigzag traversal of matrix',
      'Transpose of a matrix',
      'Rotate matrix by 90 degrees',
      'Set entire row and column to 0 if element is 0',
      'Multiply two matrices',
      'Search in row-wise and column-wise sorted matrix',
      'Find row with maximum 1s in binary matrix',
    ],
    hard: [],
  },
  {
    topic: 'Arrays & Strings',
    easy: [
      'Two Sum',
      'Best Time to Buy and Sell Stock',
      'Contains Duplicate',
      'Valid Anagram',
      'Valid Palindrome',
      'Plus One',
      'Move Zeroes',
      'Merge Sorted Array',
      'Remove Duplicates from Sorted Array',
      'Maximum Subarray',
    ],
    medium: [
      'Product of Array Except Self',
      'Rotate Array',
      'Group Anagrams',
      'Longest Consecutive Sequence',
      'Set Matrix Zeroes',
      'Spiral Matrix',
      'Rotate Image',
      'Sort Colors',
      'Encode and Decode Strings',
    ],
    hard: ['First Missing Positive', 'Trapping Rain Water'],
  },
  {
    topic: 'Two Pointers',
    easy: ['Valid Palindrome', 'Two Sum II - Input Array Is Sorted', 'Squares of a Sorted Array', 'Reverse String'],
    medium: [
      '3Sum',
      '3Sum Closest',
      'Container With Most Water',
      'Sort Colors',
      'Remove Nth Node From End of List',
    ],
    hard: ['4Sum', 'Trapping Rain Water'],
  },
  {
    topic: 'Sliding Window',
    easy: ['Maximum Average Subarray I'],
    medium: [
      'Longest Substring Without Repeating Characters',
      'Longest Repeating Character Replacement',
      'Permutation in String',
      'Max Consecutive Ones III',
      'Fruit Into Baskets',
      'Find All Anagrams in a String',
      'Subarray Product Less Than K',
    ],
    hard: [
      'Minimum Window Substring',
      'Sliding Window Maximum',
      'Substring with Concatenation of All Words',
    ],
  },
  {
    topic: 'Hashing',
    easy: [
      'Two Sum',
      'Contains Duplicate',
      'Valid Anagram',
      'Ransom Note',
      'Intersection of Two Arrays',
      'First Unique Character in a String',
    ],
    medium: [
      'Group Anagrams',
      'Top K Frequent Elements',
      'Subarray Sum Equals K',
      'Longest Consecutive Sequence',
      '4Sum II',
      'Insert Delete GetRandom O(1)',
    ],
    hard: [],
  },
  {
    topic: 'Prefix Sum',
    easy: ['Running Sum of 1d Array', 'Find Pivot Index'],
    medium: [
      'Subarray Sum Equals K',
      'Contiguous Array',
      'Range Sum Query - Immutable',
      'Range Sum Query 2D - Immutable',
      'Product of Array Except Self',
    ],
    hard: [],
  },
  {
    topic: 'Binary Search',
    easy: ['Binary Search', 'First Bad Version', 'Search Insert Position', 'Sqrt(x)'],
    medium: [
      'Search in Rotated Sorted Array',
      'Find Minimum in Rotated Sorted Array',
      'Search a 2D Matrix',
      'Find First and Last Position of Element in Sorted Array',
      'Koko Eating Bananas',
      'Find Peak Element',
      'Capacity to Ship Packages Within D Days',
    ],
    hard: ['Median of Two Sorted Arrays', 'Split Array Largest Sum'],
  },
  {
    topic: 'Sorting',
    easy: ['Merge Sorted Array', 'Sort Array By Parity'],
    medium: [
      'Sort an Array',
      'Kth Largest Element in an Array',
      'Sort Colors',
      'Merge Intervals',
      'Largest Number',
      'Top K Frequent Elements',
      'H-Index',
    ],
    hard: [],
  },
  {
    topic: 'Linked Lists',
    easy: [
      'Reverse Linked List',
      'Merge Two Sorted Lists',
      'Linked List Cycle',
      'Middle of the Linked List',
      'Remove Duplicates from Sorted List',
      'Palindrome Linked List',
      'Intersection of Two Linked Lists',
    ],
    medium: [
      'Add Two Numbers',
      'Remove Nth Node From End of List',
      'Reorder List',
      'Odd Even Linked List',
      'Copy List with Random Pointer',
      'LRU Cache',
      'Sort List',
      'Rotate List',
    ],
    hard: ['Merge k Sorted Lists', 'Reverse Nodes in k-Group'],
  },
  {
    topic: 'Stacks & Queues',
    easy: [
      'Valid Parentheses',
      'Implement Queue using Stacks',
      'Implement Stack using Queues',
      'Min Stack',
      'Baseball Game',
    ],
    medium: [
      'Evaluate Reverse Polish Notation',
      'Daily Temperatures',
      'Next Greater Element II',
      'Asteroid Collision',
      'Decode String',
      'Generate Parentheses',
      'Online Stock Span',
      'Car Fleet',
    ],
    hard: ['Largest Rectangle in Histogram', 'Basic Calculator'],
  },
  {
    topic: 'Recursion & Backtracking',
    easy: ['Fibonacci Number', 'Power of Two', 'Reverse String'],
    medium: [
      'Subsets',
      'Subsets II',
      'Permutations',
      'Permutations II',
      'Combinations',
      'Combination Sum',
      'Combination Sum II',
      'Letter Combinations of a Phone Number',
      'Generate Parentheses',
      'Word Search',
      'Palindrome Partitioning',
    ],
    hard: ['N-Queens', 'Sudoku Solver', 'Word Search II'],
  },
  {
    topic: 'Trees',
    easy: [
      'Maximum Depth of Binary Tree',
      'Invert Binary Tree',
      'Same Tree',
      'Symmetric Tree',
      'Subtree of Another Tree',
      'Diameter of Binary Tree',
      'Balanced Binary Tree',
      'Path Sum',
      'Merge Two Binary Trees',
      'Convert Sorted Array to Binary Search Tree',
      'Range Sum of BST',
      'Minimum Depth of Binary Tree',
    ],
    medium: [
      'Binary Tree Level Order Traversal',
      'Binary Tree Zigzag Level Order Traversal',
      'Binary Tree Right Side View',
      'Validate Binary Search Tree',
      'Lowest Common Ancestor of a Binary Search Tree',
      'Lowest Common Ancestor of a Binary Tree',
      'Kth Smallest Element in a BST',
      'Construct Binary Tree from Preorder and Inorder Traversal',
      'Flatten Binary Tree to Linked List',
      'Count Good Nodes in Binary Tree',
      'House Robber III',
      'Path Sum II',
      'Path Sum III',
    ],
    hard: [
      'Binary Tree Maximum Path Sum',
      'Serialize and Deserialize Binary Tree',
      'Vertical Order Traversal of a Binary Tree',
    ],
  },
  {
    topic: 'Heaps / Priority Queues',
    easy: ['Last Stone Weight', 'Kth Largest Element in a Stream'],
    medium: [
      'Kth Largest Element in an Array',
      'Top K Frequent Elements',
      'K Closest Points to Origin',
      'Task Scheduler',
      'Reorganize String',
      'Sort Characters By Frequency',
      'Find K Pairs with Smallest Sums',
    ],
    hard: [
      'Merge k Sorted Lists',
      'Find Median from Data Stream',
      'Sliding Window Median',
      'IPO',
    ],
  },
  {
    topic: 'Tries',
    easy: [],
    medium: [
      'Implement Trie (Prefix Tree)',
      'Design Add and Search Words Data Structure',
      'Map Sum Pairs',
      'Replace Words',
    ],
    hard: ['Word Search II', 'Maximum XOR of Two Numbers in an Array'],
  },
  {
    topic: 'Graphs',
    easy: ['Find the Town Judge', 'Find Center of Star Graph'],
    medium: [
      'Number of Islands',
      'Clone Graph',
      'Max Area of Island',
      'Flood Fill',
      'Rotting Oranges',
      'Pacific Atlantic Water Flow',
      'Surrounded Regions',
      'Course Schedule',
      'Course Schedule II',
      'Number of Connected Components in an Undirected Graph',
      'Graph Valid Tree',
      'Redundant Connection',
      'Walls and Gates',
      'Word Ladder',
      'Network Delay Time',
      'Cheapest Flights Within K Stops',
      'Accounts Merge',
      'Path with Minimum Effort',
    ],
    hard: [
      'Alien Dictionary',
      'Word Ladder II',
      'Reconstruct Itinerary',
      'Swim in Rising Water',
      'Critical Connections in a Network',
      'Minimum Cost to Make at Least One Valid Path in a Grid',
    ],
  },
  // Dynamic Programming — the user requested sub-pattern order; we collapse
  // into the single "Dynamic Programming" topic and keep that order.
  {
    topic: 'Dynamic Programming',
    easy: ['Climbing Stairs', 'Min Cost Climbing Stairs'],
    medium: [
      'House Robber',
      'House Robber II',
      'Maximum Subarray',
      'Decode Ways',
      'Word Break',
      'Jump Game',
      'Jump Game II',
      'Partition Equal Subset Sum',
      'Target Sum',
      'Coin Change',
      'Coin Change II',
      'Combination Sum IV',
      'Longest Common Subsequence',
      'Longest Palindromic Substring',
      'Palindromic Substrings',
      'Edit Distance',
      'Interleaving String',
      'Unique Paths',
      'Unique Paths II',
      'Minimum Path Sum',
      'Maximal Square',
      'Longest Increasing Subsequence',
      'Number of Longest Increasing Subsequence',
      'Best Time to Buy and Sell Stock II',
      'Best Time to Buy and Sell Stock with Cooldown',
      'Best Time to Buy and Sell Stock with Transaction Fee',
    ],
    hard: [
      'Distinct Subsequences',
      'Regular Expression Matching',
      'Wildcard Matching',
      'Dungeon Game',
      'Russian Doll Envelopes',
      'Best Time to Buy and Sell Stock III',
      'Best Time to Buy and Sell Stock IV',
      'Burst Balloons',
      'Longest Valid Parentheses',
    ],
  },
  {
    topic: 'Greedy',
    easy: ['Assign Cookies', 'Lemonade Change', 'Best Time to Buy and Sell Stock II'],
    medium: [
      'Jump Game',
      'Jump Game II',
      'Gas Station',
      'Partition Labels',
      'Hand of Straights',
      'Merge Intervals',
      'Non-overlapping Intervals',
      'Minimum Number of Arrows to Burst Balloons',
      'Task Scheduler',
    ],
    hard: ['Candy'],
  },
  {
    topic: 'Intervals',
    easy: ['Meeting Rooms'],
    medium: [
      'Merge Intervals',
      'Insert Interval',
      'Non-overlapping Intervals',
      'Meeting Rooms II',
      'Minimum Number of Arrows to Burst Balloons',
      'Interval List Intersections',
    ],
    hard: ['Employee Free Time'],
  },
  {
    topic: 'Bit Manipulation',
    easy: [
      'Number of 1 Bits',
      'Counting Bits',
      'Reverse Bits',
      'Single Number',
      'Missing Number',
      'Power of Two',
    ],
    medium: [
      'Single Number II',
      'Single Number III',
      'Sum of Two Integers',
      'Bitwise AND of Numbers Range',
      'Subsets',
    ],
    hard: ['Maximum XOR of Two Numbers in an Array'],
  },
  {
    topic: 'Math & Number Theory',
    easy: [
      'Palindrome Number',
      'Fizz Buzz',
      'Roman to Integer',
      'Happy Number',
      'Add Digits',
      'Excel Sheet Column Number',
    ],
    medium: [
      'Integer to Roman',
      'Pow(x, n)',
      'Count Primes',
      'Factorial Trailing Zeroes',
      'Multiply Strings',
      'Rotate Image',
      'Random Pick with Weight',
    ],
    hard: ['Max Points on a Line', 'Basic Calculator II'],
  },
];

// Preserve existing (topic, title) → id assignments so edits don't shuffle
// progress in users' IndexedDB.
const existingIdByKey = new Map();
let maxExistingId = 0;
if (existsSync(out)) {
  try {
    const prev = JSON.parse(readFileSync(out, 'utf-8'));
    for (const p of prev) {
      existingIdByKey.set(`${p.topic}::${p.title}`, p.id);
      if (p.id > maxExistingId) maxExistingId = p.id;
    }
  } catch {
    // fall through with a fresh sequence
  }
}

const problems = [];
let nextId = maxExistingId + 1;
let order = 1;
const seenKeys = new Set();
for (const { topic, easy = [], medium = [], hard = [], noUrl = false } of catalog) {
  const buckets = [
    ['easy', easy],
    ['medium', medium],
    ['hard', hard],
  ];
  for (const [difficulty, titles] of buckets) {
    for (const title of titles) {
      const key = `${topic}::${title}`;
      // The catalog may have a duplicate row inside one topic if you forget
      // to dedupe — skip it rather than silently produce two cards.
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const id = existingIdByKey.get(key) ?? nextId++;
      problems.push({
        id,
        title,
        topic,
        difficulty,
        order_index: order++,
        ...(noUrl ? {} : { url: url(title) }),
      });
    }
  }
}

problems.sort((a, b) => a.order_index - b.order_index);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(problems, null, 2) + '\n');

const byTopic = problems.reduce((acc, p) => {
  acc[p.topic] = (acc[p.topic] ?? 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${problems.length} problems to ${out}`);
for (const [topic, n] of Object.entries(byTopic)) {
  console.log(`  ${n.toString().padStart(3)} · ${topic}`);
}
