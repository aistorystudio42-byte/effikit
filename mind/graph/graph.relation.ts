/**
 * @keywords    graph, relation, edge, node, directed, undirected, adjacency, relationship, knowledge graph
 * @domain      Graph Relation
 * @use-when    Modeling relationships between entities: social networks, dependency graphs, knowledge bases
 * @not-when    You need visual rendering — this is data-layer only; pair with D3 or Cytoscape for visualization
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GraphNode<T = Record<string, unknown>> {
  id: string;
  label?: string;
  data: T;
}

export interface GraphEdge<E = Record<string, unknown>> {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight: number;
  directed: boolean;
  data: E;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  density: number;        // Ratio of actual to possible edges
  isDirected: boolean;
  avgDegree: number;
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export class Graph<N = Record<string, unknown>, E = Record<string, unknown>> {
  private nodes: Map<string, GraphNode<N>> = new Map();
  private edges: Map<string, GraphEdge<E>> = new Map();
  // Adjacency: nodeId → Set of edge IDs
  private outEdges: Map<string, Set<string>> = new Map();
  private inEdges:  Map<string, Set<string>> = new Map();
  private directed: boolean;

  constructor(directed = true) {
    this.directed = directed;
  }

  // ─── Nodes ─────────────────────────────────────────────────────────────────

  addNode(id: string, data: N, label?: string): GraphNode<N> {
    const node: GraphNode<N> = { id, label, data };
    this.nodes.set(id, node);
    if (!this.outEdges.has(id)) this.outEdges.set(id, new Set());
    if (!this.inEdges.has(id))  this.inEdges.set(id, new Set());
    return node;
  }

  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;

    // Remove all edges incident to this node
    const allEdges = new Set([
      ...(this.outEdges.get(id) ?? []),
      ...(this.inEdges.get(id)  ?? []),
    ]);
    for (const edgeId of allEdges) this.removeEdge(edgeId);

    this.nodes.delete(id);
    this.outEdges.delete(id);
    this.inEdges.delete(id);
    return true;
  }

  getNode(id: string): GraphNode<N> | undefined { return this.nodes.get(id); }
  hasNode(id: string): boolean { return this.nodes.has(id); }
  allNodes(): GraphNode<N>[] { return [...this.nodes.values()]; }

  updateNode(id: string, data: Partial<N>): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    node.data = { ...node.data, ...data };
    return true;
  }

  // ─── Edges ─────────────────────────────────────────────────────────────────

  addEdge(
    source: string,
    target: string,
    data: E,
    options: { weight?: number; label?: string; directed?: boolean } = {}
  ): GraphEdge<E> {
    if (!this.nodes.has(source)) throw new Error(`Node "${source}" not found`);
    if (!this.nodes.has(target)) throw new Error(`Node "${target}" not found`);

    const id = `${source}->${target}`;
    const isDirected = options.directed ?? this.directed;

    const edge: GraphEdge<E> = {
      id,
      source,
      target,
      weight: options.weight ?? 1,
      label: options.label,
      directed: isDirected,
      data,
    };

    this.edges.set(id, edge);
    this.outEdges.get(source)!.add(id);
    this.inEdges.get(target)!.add(id);

    if (!isDirected) {
      const reverseId = `${target}->${source}`;
      const reverseEdge = { ...edge, id: reverseId, source: target, target: source };
      this.edges.set(reverseId, reverseEdge);
      this.outEdges.get(target)!.add(reverseId);
      this.inEdges.get(source)!.add(reverseId);
    }

    return edge;
  }

  removeEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.outEdges.get(edge.source)?.delete(id);
    this.inEdges.get(edge.target)?.delete(id);
    this.edges.delete(id);

    if (!edge.directed) {
      const reverseId = `${edge.target}->${edge.source}`;
      const rev = this.edges.get(reverseId);
      if (rev) {
        this.outEdges.get(rev.source)?.delete(reverseId);
        this.inEdges.get(rev.target)?.delete(reverseId);
        this.edges.delete(reverseId);
      }
    }

    return true;
  }

  getEdge(source: string, target: string): GraphEdge<E> | undefined {
    return this.edges.get(`${source}->${target}`);
  }

  hasEdge(source: string, target: string): boolean {
    return this.edges.has(`${source}->${target}`);
  }

  allEdges(): GraphEdge<E>[] {
    return this.directed
      ? [...this.edges.values()]
      : [...this.edges.values()].filter((e) => e.source <= e.target); // Deduplicate undirected, keep self-loops
  }

  // ─── Neighbors ─────────────────────────────────────────────────────────────

  neighbors(nodeId: string): GraphNode<N>[] {
    return [...(this.outEdges.get(nodeId) ?? [])]
      .map((eid) => this.edges.get(eid)?.target)
      .filter((id): id is string => id !== undefined)
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  predecessors(nodeId: string): GraphNode<N>[] {
    return [...(this.inEdges.get(nodeId) ?? [])]
      .map((eid) => this.edges.get(eid)?.source)
      .filter((id): id is string => id !== undefined)
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  outDegree(nodeId: string): number { return this.outEdges.get(nodeId)?.size ?? 0; }
  inDegree(nodeId: string):  number { return this.inEdges.get(nodeId)?.size ?? 0; }
  degree(nodeId: string):    number { return this.outDegree(nodeId) + (this.directed ? this.inDegree(nodeId) : 0); }

  // ─── Subgraph ──────────────────────────────────────────────────────────────

  subgraph(nodeIds: string[]): Graph<N, E> {
    const sub = new Graph<N, E>(this.directed);
    const nodeSet = new Set(nodeIds);

    for (const id of nodeIds) {
      const node = this.nodes.get(id);
      if (node) sub.addNode(node.id, node.data, node.label);
    }

    for (const edge of this.allEdges()) {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        sub.addEdge(edge.source, edge.target, edge.data, {
          weight: edge.weight, label: edge.label, directed: edge.directed,
        });
      }
    }

    return sub;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  get stats(): GraphStats {
    const n = this.nodes.size;
    const e = this.allEdges().length;
    const maxEdges = this.directed ? n * (n - 1) : (n * (n - 1)) / 2;
    const totalDegree = [...this.nodes.keys()].reduce((s, id) => s + this.outDegree(id), 0);

    return {
      nodeCount: n,
      edgeCount: e,
      density: maxEdges === 0 ? 0 : e / maxEdges,
      isDirected: this.directed,
      avgDegree: n === 0 ? 0 : totalDegree / n,
    };
  }
}

// ─── RelationMap ──────────────────────────────────────────────────────────────
// Typed relationship store for knowledge graph / entity linking use cases

export type RelationType = string;

export class RelationMap<N = Record<string, unknown>> {
  private graph: Graph<N>;
  private relationTypes: Map<string, RelationType> = new Map(); // edgeId → type

  constructor() {
    this.graph = new Graph<N>(true);
  }

  entity(id: string, data: N, label?: string): this {
    this.graph.addNode(id, data, label);
    return this;
  }

  relate(
    source: string,
    relation: RelationType,
    target: string,
    weight = 1.0
  ): this {
    const edge = this.graph.addEdge(source, target, {} as Record<string, unknown> as N, { weight });
    this.relationTypes.set(edge.id, relation);
    return this;
  }

  related(
    entityId: string,
    relation?: RelationType
  ): Array<{ entity: GraphNode<N>; relation: RelationType; weight: number }> {
    return this.graph.neighbors(entityId)
      .map((neighbor) => {
        const edgeId = `${entityId}->${neighbor.id}`;
        const rel = this.relationTypes.get(edgeId) ?? "related";
        const edge = this.graph.getEdge(entityId, neighbor.id);
        return { entity: neighbor, relation: rel, weight: edge?.weight ?? 1 };
      })
      .filter((r) => !relation || r.relation === relation);
  }

  get internalGraph(): Graph<N> { return this.graph; }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createGraph<N = Record<string, unknown>, E = Record<string, unknown>>(
  directed = true
): Graph<N, E> {
  return new Graph(directed);
}

export function createRelationMap<N = Record<string, unknown>>(): RelationMap<N> {
  return new RelationMap();
}

/*
 * Usage Example:
 *
 * const g = createGraph<{ name: string }>();
 * g.addNode("alice", { name: "Alice" });
 * g.addNode("bob",   { name: "Bob"   });
 * g.addNode("carol", { name: "Carol" });
 * g.addEdge("alice", "bob",   {}, { weight: 0.8 });
 * g.addEdge("alice", "carol", {}, { weight: 0.5 });
 * g.neighbors("alice"); // [{ id: "bob" }, { id: "carol" }]
 *
 * // Knowledge graph
 * const km = createRelationMap<{ type: string }>();
 * km.entity("apple",  { type: "fruit"  })
 *   .entity("vitamin-c", { type: "nutrient" })
 *   .relate("apple", "contains", "vitamin-c", 0.9);
 * km.related("apple", "contains"); // [{ entity: { id: "vitamin-c" }, relation: "contains", weight: 0.9 }]
 */
