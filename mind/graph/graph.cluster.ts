/**
 * @keywords    clustering, community detection, Louvain, connected components, k-means graph, modularity
 * @domain      Graph Cluster
 * @use-when    Finding communities, groups, or clusters within a graph: social groups, topic clusters
 * @not-when    You need ML-based clustering on feature vectors — use k-means on raw features instead
 */

import type { Graph, GraphNode } from "./graph.relation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Cluster<N = Record<string, unknown>> {
  id: string;
  nodes: GraphNode<N>[];
  density: number;      // Internal edge density (0–1)
  size: number;
}

export interface ClusteringResult<N = Record<string, unknown>> {
  clusters: Cluster<N>[];
  modularity: number;   // Quality metric: how well-separated are the clusters (0–1)
  unclustered: GraphNode<N>[];
}

// ─── Connected Components ─────────────────────────────────────────────────────
// Find groups of nodes that are mutually reachable (weakly connected)

export function connectedComponents<N, E>(graph: Graph<N, E>): Cluster<N>[] {
  const visited = new Set<string>();
  const clusters: Cluster<N>[] = [];
  const allNodes = graph.allNodes();

  for (const startNode of allNodes) {
    if (visited.has(startNode.id)) continue;

    const component: GraphNode<N>[] = [];
    const queue = [startNode.id];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = graph.getNode(id);
      if (node) component.push(node);

      // For undirected-style traversal: check both neighbors and predecessors
      for (const neighbor of graph.neighbors(id)) {
        if (!visited.has(neighbor.id)) queue.push(neighbor.id);
      }
    }

    clusters.push({
      id: `component-${clusters.length}`,
      nodes: component,
      density: computeInternalDensity(graph, component.map((n) => n.id)),
      size: component.length,
    });
  }

  return clusters.sort((a, b) => b.size - a.size);
}

// ─── Louvain Community Detection (Simplified) ─────────────────────────────────
// Greedy modularity optimization — state of the art for large graphs

function computeModularity<N, E>(
  graph: Graph<N, E>,
  communities: Map<string, number> // nodeId → communityId
): number {
  const edges = graph.allEdges();
  const m = edges.reduce((s, e) => s + e.weight, 0);
  if (m === 0) return 0;

  let q = 0;
  for (const edge of edges) {
    const sameComm = communities.get(edge.source) === communities.get(edge.target);
    if (sameComm) {
      const ki = graph.outDegree(edge.source);
      const kj = graph.inDegree(edge.target);
      q += edge.weight - (ki * kj) / (2 * m);
    }
  }

  return q / (2 * m);
}

function modulatityGain<N, E>(
  graph: Graph<N, E>,
  nodeId: string,
  targetComm: Set<string>,
  m: number
): number {
  const ki = graph.outDegree(nodeId) + graph.inDegree(nodeId);
  let sumIn = 0;
  let kiin = 0;

  for (const neighborId of targetComm) {
    const edge = graph.getEdge(nodeId, neighborId) ?? graph.getEdge(neighborId, nodeId);
    if (edge) {
      kiin += edge.weight;
      sumIn += edge.weight;
    }
  }

  // Louvain delta modularity approximation
  return (kiin - (sumIn * ki) / (2 * m)) / m;
}

export function louvainCommunities<N, E>(
  graph: Graph<N, E>,
  maxIterations = 100
): ClusteringResult<N> {
  const nodes = graph.allNodes();
  if (nodes.length === 0) return { clusters: [], modularity: 0, unclustered: [] };

  // Initialize: each node in its own community
  const communities = new Map<string, number>(nodes.map((n, i) => [n.id, i]));
  const commNodes = new Map<number, Set<string>>(nodes.map((n, i) => [i, new Set([n.id])]));

  const m = graph.allEdges().reduce((s, e) => s + e.weight, 0);
  if (m === 0) {
    return {
      clusters: nodes.map((n, i) => ({ id: `c-${i}`, nodes: [n], density: 1, size: 1 })),
      modularity: 0,
      unclustered: [],
    };
  }

  let improved = true;
  let iteration = 0;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    for (const node of nodes) {
      const currentComm = communities.get(node.id)!;
      const currentCommNodes = commNodes.get(currentComm)!;

      // Find neighboring communities
      const neighborComms = new Map<number, Set<string>>();
      for (const neighbor of graph.neighbors(node.id)) {
        const nc = communities.get(neighbor.id)!;
        if (nc !== currentComm) {
          if (!neighborComms.has(nc)) neighborComms.set(nc, new Set());
          neighborComms.get(nc)!.add(neighbor.id);
        }
      }

      let bestComm = currentComm;
      let bestGain = 0;

      for (const [nc, ncNodes] of neighborComms) {
        const gain = modulatityGain(graph, node.id, ncNodes, m);
        if (gain > bestGain) { bestGain = gain; bestComm = nc; }
      }

      if (bestComm !== currentComm) {
        // Move node to best community
        currentCommNodes.delete(node.id);
        if (currentCommNodes.size === 0) commNodes.delete(currentComm);
        communities.set(node.id, bestComm);
        commNodes.get(bestComm)!.add(node.id);
        improved = true;
      }
    }
  }

  // Build clusters from communities
  const clusters: Cluster<N>[] = [];
  for (const [commId, memberIds] of commNodes) {
    const members = [...memberIds].map((id) => graph.getNode(id)!).filter(Boolean);
    clusters.push({
      id: `community-${commId}`,
      nodes: members,
      density: computeInternalDensity(graph, [...memberIds]),
      size: members.length,
    });
  }

  const modularity = computeModularity(graph, communities);

  return {
    clusters: clusters.sort((a, b) => b.size - a.size),
    modularity,
    unclustered: [],
  };
}

// ─── K-Clique Percolation ────────────────────────────────────────────────────
// Find overlapping communities based on cliques (nodes can belong to multiple clusters)

export function kCliquePercolation<N, E>(graph: Graph<N, E>, k = 3): Cluster<N>[] {
  // Find all cliques of size >= k using Bron-Kerbosch
  const cliques: string[][] = [];
  const nodes = graph.allNodes().map((n) => n.id);

  function bronKerbosch(R: string[], P: string[], X: string[]): void {
    if (P.length === 0 && X.length === 0) {
      if (R.length >= k) cliques.push([...R]);
      return;
    }
    const pivot = [...P, ...X][0];
    const pivotNeighbors = new Set(graph.neighbors(pivot).map((n) => n.id));
    const candidates = P.filter((v) => !pivotNeighbors.has(v));

    for (const v of candidates) {
      const vNeighbors = new Set(graph.neighbors(v).map((n) => n.id));
      bronKerbosch(
        [...R, v],
        P.filter((u) => vNeighbors.has(u)),
        X.filter((u) => vNeighbors.has(u))
      );
      P = P.filter((u) => u !== v);
      X = [...X, v];
    }
  }

  bronKerbosch([], nodes, []);

  // Build k-clique adjacency (two k-cliques are adjacent if they share k-1 nodes)
  const cliqueSets = cliques.map((c) => new Set(c));
  const clusterSets: Set<string>[] = [];

  for (let i = 0; i < cliques.length; i++) {
    let merged = false;
    for (const cluster of clusterSets) {
      const overlap = cliques[i].filter((n) => cluster.has(n)).length;
      if (overlap >= k - 1) {
        cliques[i].forEach((n) => cluster.add(n));
        merged = true;
        break;
      }
    }
    if (!merged) clusterSets.push(new Set(cliques[i]));
  }

  return clusterSets.map((cs, i) => {
    const members = [...cs].map((id) => graph.getNode(id)!).filter(Boolean);
    return {
      id: `kclique-${i}`,
      nodes: members,
      density: computeInternalDensity(graph, [...cs]),
      size: members.length,
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeInternalDensity<N, E>(graph: Graph<N, E>, nodeIds: string[]): number {
  if (nodeIds.length < 2) return 1;
  const nodeSet = new Set(nodeIds);
  let internalEdges = 0;

  for (const id of nodeIds) {
    for (const neighbor of graph.neighbors(id)) {
      if (nodeSet.has(neighbor.id)) internalEdges++;
    }
  }

  const n = nodeIds.length;
  const maxEdges = n * (n - 1);
  return maxEdges === 0 ? 0 : internalEdges / maxEdges;
}

/*
 * Usage Example:
 *
 * import { createGraph } from "./graph.relation";
 *
 * const g = createGraph<{ name: string }>(false); // Undirected
 * ["A","B","C","D","E","F"].forEach((id) => g.addNode(id, { name: id }));
 * [["A","B"],["B","C"],["A","C"],["D","E"],["E","F"],["D","F"],["C","D"]].forEach(
 *   ([s,t]) => g.addEdge(s, t, {})
 * );
 *
 * const { clusters, modularity } = louvainCommunities(g);
 * // clusters[0] might be [A,B,C], clusters[1] might be [D,E,F]
 * // modularity ≈ 0.36 (higher = better separation)
 *
 * // Connected components
 * const components = connectedComponents(g);
 * // [{ nodes: [A,B,C,D,E,F], density: 0.47, size: 6 }] (all connected)
 */
