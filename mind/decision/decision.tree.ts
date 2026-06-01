/**
 * @keywords    decision tree, traversal, rule tree, branching logic, if-else tree, classification
 * @domain      Decision Tree
 * @use-when    Building configurable branching logic trees for routing, classification, or rule evaluation
 * @not-when    You need ML-trained decision trees — use a proper ML library; this is for hand-crafted rule trees
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeType = "condition" | "action" | "split";

export interface ConditionNode<C = Record<string, unknown>> {
  type: "condition";
  id: string;
  label: string;
  evaluate: (context: C) => boolean;
  trueBranch: DecisionNode<C>;
  falseBranch: DecisionNode<C>;
}

export interface ActionNode<C = Record<string, unknown>, R = unknown> {
  type: "action";
  id: string;
  label: string;
  execute: (context: C) => R;
}

export interface SplitNode<C = Record<string, unknown>> {
  type: "split";
  id: string;
  label: string;
  // Returns the key of the branch to take
  select: (context: C) => string;
  branches: Record<string, DecisionNode<C>>;
  defaultBranch?: DecisionNode<C>;
}

export type DecisionNode<C = Record<string, unknown>, R = unknown> =
  | ConditionNode<C>
  | ActionNode<C, R>
  | SplitNode<C>;

export interface TraversalStep<C = Record<string, unknown>> {
  nodeId: string;
  nodeType: NodeType;
  label: string;
  outcome?: string; // "true" | "false" | branch key for condition/split nodes
}

export interface TraversalResult<R = unknown> {
  result: R;
  path: TraversalStep[];
  depth: number;
}

// ─── Traversal Engine ─────────────────────────────────────────────────────────

export class DecisionTree<C = Record<string, unknown>, R = unknown> {
  private root: DecisionNode<C, R>;
  private maxDepth: number;

  constructor(root: DecisionNode<C, R>, maxDepth = 100) {
    this.root = root;
    this.maxDepth = maxDepth;
  }

  evaluate(context: C): TraversalResult<R> {
    const path: TraversalStep[] = [];
    const visited = new Set<string>();
    const result = this.traverse(this.root, context, path, 0, visited);
    return { result, path, depth: path.length };
  }

  private traverse(
    node: DecisionNode<C, R>,
    context: C,
    path: TraversalStep[],
    depth: number,
    visited: Set<string>
  ): R {
    if (depth > this.maxDepth) {
      throw new Error(`DecisionTree: max depth ${this.maxDepth} exceeded at node "${node.id}"`);
    }
    if (visited.has(node.id)) {
      throw new Error(`DecisionTree: infinite loop detected at node "${node.id}"`);
    }
    visited.add(node.id);

    if (node.type === "action") {
      path.push({ nodeId: node.id, nodeType: "action", label: node.label });
      return node.execute(context);
    }

    if (node.type === "condition") {
      const result = node.evaluate(context);
      path.push({
        nodeId: node.id,
        nodeType: "condition",
        label: node.label,
        outcome: result ? "true" : "false",
      });
      return this.traverse(result ? node.trueBranch : node.falseBranch, context, path, depth + 1, visited);
    }

    if (node.type === "split") {
      const key = node.select(context);
      const branch = node.branches[key] ?? node.defaultBranch;
      path.push({ nodeId: node.id, nodeType: "split", label: node.label, outcome: key });

      if (!branch) {
        throw new Error(`DecisionTree: no branch found for key "${key}" in split node "${node.id}"`);
      }

      return this.traverse(branch, context, path, depth + 1, visited);
    }

    throw new Error(`DecisionTree: unknown node type`);
  }

  // Collect all leaf (action) node labels for documentation/introspection
  getLeafLabels(node: DecisionNode<C, R> = this.root, seen = new Set<string>()): string[] {
    if (seen.has(node.id)) return [];
    seen.add(node.id);

    if (node.type === "action") return [node.label];

    if (node.type === "condition") {
      return [
        ...this.getLeafLabels(node.trueBranch, seen),
        ...this.getLeafLabels(node.falseBranch, seen),
      ];
    }

    if (node.type === "split") {
      const branches = Object.values(node.branches);
      if (node.defaultBranch) branches.push(node.defaultBranch);
      return branches.flatMap((b) => this.getLeafLabels(b, seen));
    }

    return [];
  }
}

// ─── Builder DSL ──────────────────────────────────────────────────────────────

export function condition<C, R>(
  id: string,
  label: string,
  evaluate: (ctx: C) => boolean,
  trueBranch: DecisionNode<C, R>,
  falseBranch: DecisionNode<C, R>
): ConditionNode<C> {
  return { type: "condition", id, label, evaluate, trueBranch, falseBranch };
}

export function action<C, R>(
  id: string,
  label: string,
  execute: (ctx: C) => R
): ActionNode<C, R> {
  return { type: "action", id, label, execute };
}

export function split<C, R>(
  id: string,
  label: string,
  select: (ctx: C) => string,
  branches: Record<string, DecisionNode<C, R>>,
  defaultBranch?: DecisionNode<C, R>
): SplitNode<C> {
  return { type: "split", id, label, select, branches, defaultBranch };
}

export function createTree<C, R>(
  root: DecisionNode<C, R>,
  maxDepth?: number
): DecisionTree<C, R> {
  return new DecisionTree(root, maxDepth);
}

/*
 * Usage Example:
 *
 * interface OrderContext { amount: number; userTier: "free" | "pro" | "enterprise"; country: string; }
 * type DiscountResult = { rate: number; reason: string };
 *
 * const tree = createTree<OrderContext, DiscountResult>(
 *   condition("is-enterprise", "Is enterprise user?",
 *     (ctx) => ctx.userTier === "enterprise",
 *     action("enterprise-discount", "Apply 30% discount", () => ({ rate: 0.3, reason: "enterprise" })),
 *     split("by-tier", "Select by tier",
 *       (ctx) => ctx.userTier,
 *       {
 *         pro:  action("pro-discount",  "Apply 15% discount", () => ({ rate: 0.15, reason: "pro" })),
 *         free: condition("high-value", "Is high-value order?",
 *           (ctx) => ctx.amount > 500,
 *           action("loyalty-discount", "Apply 5% discount", () => ({ rate: 0.05, reason: "loyalty" })),
 *           action("no-discount",      "No discount",        () => ({ rate: 0,    reason: "none" }))
 *         ),
 *       }
 *     )
 *   )
 * );
 *
 * const { result, path } = tree.evaluate({ amount: 600, userTier: "free", country: "TR" });
 * // result: { rate: 0.05, reason: "loyalty" }
 * // path: shows each node traversed
 */
