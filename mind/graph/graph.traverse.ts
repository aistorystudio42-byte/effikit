/**
 * @keywords    BFS, DFS, Dijkstra, shortest path, graph traversal, topological sort, cycle detection
 * @domain      Graph Traverse
 * @use-when    Traversing graphs: shortest paths, reachability, topological ordering, cycle detection
 * @not-when    Your graph has millions of edges — use a native graph database for that scale
 */

import type { Graph, GraphNode, GraphEdge } from "./graph.relation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TraversalResult<N> {
  visited: GraphNode<N>[];
  order: string[];        // Node IDs in traversal order
  predecessors: Record<string, string | null>; // nodeId → parent node ID
}

export interface ShortestPathResult<N> {
  path: GraphNode<N>[];
  totalWeight: number;
  found: boolean;
}

export interface TopologicalSortResult<N> {
  order: GraphNode<N>[];
  hasCycle: boolean;
}

// ─── BFS (Breadth-First Search) ───────────────────────────────────────────────

export function bfs<N, E>(
  graph: Graph<N, E>,
  startId: string,
  options: {
    maxDepth?: number;
    target?: string;
    filter?: (node: GraphNode<N>) => boolean;
  } = {}
): TraversalResult<N> {
  const visited: GraphNode<N>[] = [];
  const order: string[] = [];
  const predecessors: Record<string, string | null> = {};
  const seen = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  predecessors[startId] = null;

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const node = graph.getNode(id);
    if (!node) continue;
    if (options.filter && !options.filter(node)) continue;

    visited.push(node);
    order.push(id);

    if (options.target && id === options.target) break;
    if (options.maxDepth !== undefined && depth >= options.maxDepth) continue;

    for (const neighbor of graph.neighbors(id)) {
      if (!seen.has(neighbor.id)) {
        predecessors[neighbor.id] = id;
        queue.push({ id: neighbor.id, depth: depth + 1 });
      }
    }
  }

  return { visited, order, predecessors };
}

// ─── DFS (Depth-First Search) ─────────────────────────────────────────────────

export function dfs<N, E>(
  graph: Graph<N, E>,
  startId: string,
  options: {
    maxDepth?: number;
    target?: string;
    filter?: (node: GraphNode<N>) => boolean;
    iterative?: boolean; // Default: iterative (avoids stack overflow on deep graphs)
  } = {}
): TraversalResult<N> {
  const visited: GraphNode<N>[] = [];
  const order: string[] = [];
  const predecessors: Record<string, string | null> = { [startId]: null };
  const seen = new Set<string>();

  if (options.iterative !== false) {
    // Iterative DFS using explicit stack
    const stack: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

    while (stack.length > 0) {
      const { id, depth } = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);

      const node = graph.getNode(id);
      if (!node) continue;
      if (options.filter && !options.filter(node)) continue;

      visited.push(node);
      order.push(id);

      if (options.target && id === options.target) break;
      if (options.maxDepth !== undefined && depth >= options.maxDepth) continue;

      // Push in reverse to maintain DFS order (rightmost pushed last → explored first)
      const neighbors = [...graph.neighbors(id)].reverse();
      for (const neighbor of neighbors) {
        if (!seen.has(neighbor.id)) {
          predecessors[neighbor.id] = id;
          stack.push({ id: neighbor.id, depth: depth + 1 });
        }
      }
    }
  }

  return { visited, order, predecessors };
}

// Reconstruct path from predecessors map
export function reconstructPath<N>(
  graph: Graph<N, unknown>,
  predecessors: Record<string, string | null>,
  targetId: string
): GraphNode<N>[] {
  const path: GraphNode<N>[] = [];
  let current: string | null = targetId;

  while (current !== null) {
    const node = graph.getNode(current);
    if (!node) break;
    path.unshift(node);
    current = predecessors[current] ?? null;
  }

  return path;
}

// ─── Dijkstra's Algorithm ─────────────────────────────────────────────────────

export function dijkstra<N, E>(
  graph: Graph<N, E>,
  sourceId: string,
  targetId?: string
): {
  distances: Record<string, number>;
  predecessors: Record<string, string | null>;
  shortestPath: (target: string) => ShortestPathResult<N>;
} {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of graph.allNodes()) {
    dist[node.id] = Infinity;
    prev[node.id] = null;
    unvisited.add(node.id);
  }
  dist[sourceId] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with minimum distance (naive O(n²), sufficient for most graphs)
    let u: string | null = null;
    let minDist = Infinity;
    for (const id of unvisited) {
      if (dist[id] < minDist) { minDist = dist[id]; u = id; }
    }

    if (u === null || dist[u] === Infinity) break;
    unvisited.delete(u);

    if (targetId && u === targetId) break; // Early exit if target found

    for (const neighbor of graph.neighbors(u)) {
      if (!unvisited.has(neighbor.id)) continue;
      const edge = graph.getEdge(u, neighbor.id);
      const alt = dist[u] + (edge?.weight ?? 1);
      if (alt < dist[neighbor.id]) {
        dist[neighbor.id] = alt;
        prev[neighbor.id] = u;
      }
    }
  }

  const shortestPath = (target: string): ShortestPathResult<N> => {
    if (dist[target] === Infinity) return { path: [], totalWeight: Infinity, found: false };
    const path: GraphNode<N>[] = [];
    let curr: string | null = target;
    while (curr !== null) {
      const node = graph.getNode(curr);
      if (node) path.unshift(node);
      curr = prev[curr] ?? null;
    }
    return { path, totalWeight: dist[target], found: true };
  };

  return { distances: dist, predecessors: prev, shortestPath };
}

// ─── Topological Sort (Kahn's Algorithm) ─────────────────────────────────────

export function topologicalSort<N, E>(graph: Graph<N, E>): TopologicalSortResult<N> {
  const inDegreeMap: Record<string, number> = {};
  for (const node of graph.allNodes()) inDegreeMap[node.id] = graph.inDegree(node.id);

  const queue: string[] = Object.entries(inDegreeMap)
    .filter(([, d]) => d === 0)
    .map(([id]) => id);

  const order: GraphNode<N>[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = graph.getNode(id);
    if (node) order.push(node);

    for (const neighbor of graph.neighbors(id)) {
      inDegreeMap[neighbor.id]--;
      if (inDegreeMap[neighbor.id] === 0) queue.push(neighbor.id);
    }
  }

  const hasCycle = order.length !== graph.allNodes().length;
  return { order, hasCycle };
}

// ─── Cycle Detection ──────────────────────────────────────────────────────────

export function hasCycle<N, E>(graph: Graph<N, E>): boolean {
  return topologicalSort(graph).hasCycle;
}

export function findCycles<N, E>(graph: Graph<N, E>): string[][] {
  // Johnson's algorithm (simplified): find all simple cycles via DFS
  const cycles: string[][] = [];
  const allNodes = graph.allNodes().map((n) => n.id);

  for (const start of allNodes) {
    const visited = new Set<string>();
    const stack: string[] = [];

    const dfsForCycles = (current: string): void => {
      visited.add(current);
      stack.push(current);

      for (const neighbor of graph.neighbors(current)) {
        if (neighbor.id === start && stack.length > 1) {
          cycles.push([...stack, start]);
        } else if (!visited.has(neighbor.id)) {
          dfsForCycles(neighbor.id);
        }
      }

      stack.pop();
    };

    dfsForCycles(start);
  }

  return cycles;
}

/*
 * Usage Example:
 *
 * import { createGraph } from "./graph.relation";
 *
 * const g = createGraph<{ name: string }>();
 * ["A","B","C","D","E"].forEach((id) => g.addNode(id, { name: id }));
 * g.addEdge("A","B", {}, { weight: 4 });
 * g.addEdge("A","C", {}, { weight: 2 });
 * g.addEdge("C","B", {}, { weight: 1 });
 * g.addEdge("B","D", {}, { weight: 5 });
 * g.addEdge("C","D", {}, { weight: 8 });
 * g.addEdge("D","E", {}, { weight: 2 });
 *
 * // Shortest path A → E
 * const { shortestPath } = dijkstra(g, "A");
 * const { path, totalWeight } = shortestPath("E");
 * // path: [A, C, B, D, E], totalWeight: 10
 *
 * // BFS reachability from A
 * const { visited } = bfs(g, "A", { maxDepth: 2 });
 *
 * // Topological sort
 * const { order, hasCycle } = topologicalSort(g);
 */
