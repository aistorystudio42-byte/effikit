/**
 * @keywords    rbac, role, permission, policy, can, cannot, guard, acl, access control, authorization
 * @domain      Auth Permission
 * @use-when    Implementing role-based access control, feature flags per role, or resource-level authorization
 * @not-when    Simple boolean auth checks — this system is for multi-role, multi-resource authorization
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action    = string;  // e.g. "read", "write", "delete", "publish"
export type Resource  = string;  // e.g. "post", "user", "billing", "*"
export type RoleName  = string;

export interface Permission {
  action:    Action;
  resource:  Resource;
  // Optional condition — return true to allow, false to deny
  condition?: (context: AuthContext) => boolean;
}

export interface Role {
  name:        RoleName;
  permissions: Permission[];
  // Roles this role inherits from (permissions are merged)
  inherits?:   RoleName[];
}

export interface AuthContext {
  userId?:    string;
  roles:      RoleName[];
  // Additional context for conditions (ownership, plan tier, etc.)
  [key: string]: unknown;
}

// ─── PermissionEngine ─────────────────────────────────────────────────────────

export class PermissionEngine {
  private roles = new Map<RoleName, Role>();

  // Register roles — can be called multiple times to add/update
  registerRoles(roles: Role[]): void {
    roles.forEach((r) => this.roles.set(r.name, r));
  }

  // Collect all permissions for a set of roles (including inherited)
  private resolvePermissions(roleNames: RoleName[], visited = new Set<RoleName>()): Permission[] {
    const permissions: Permission[] = [];
    for (const name of roleNames) {
      if (visited.has(name)) continue;
      visited.add(name);
      const role = this.roles.get(name);
      if (!role) continue;
      permissions.push(...role.permissions);
      if (role.inherits?.length) {
        permissions.push(...this.resolvePermissions(role.inherits, visited));
      }
    }
    return permissions;
  }

  can(context: AuthContext, action: Action, resource: Resource): boolean {
    const permissions = this.resolvePermissions(context.roles);
    return permissions.some((p) => {
      const actionMatch   = p.action === action   || p.action === "*";
      const resourceMatch = p.resource === resource || p.resource === "*";
      if (!actionMatch || !resourceMatch) return false;
      return p.condition ? p.condition(context) : true;
    });
  }

  cannot(context: AuthContext, action: Action, resource: Resource): boolean {
    return !this.can(context, action, resource);
  }

  // Returns all allowed actions for a resource
  allowedActions(context: AuthContext, resource: Resource): Action[] {
    const permissions = this.resolvePermissions(context.roles);
    const actions = new Set<Action>();
    for (const p of permissions) {
      if (p.resource === resource || p.resource === "*") {
        const allowed = p.condition ? p.condition(context) : true;
        if (allowed) actions.add(p.action);
      }
    }
    return Array.from(actions);
  }

  // Returns all resources the context has access to for a given action
  allowedResources(context: AuthContext, action: Action): Resource[] {
    const permissions = this.resolvePermissions(context.roles);
    const resources = new Set<Resource>();
    for (const p of permissions) {
      if (p.action === action || p.action === "*") {
        const allowed = p.condition ? p.condition(context) : true;
        if (allowed) resources.add(p.resource);
      }
    }
    return Array.from(resources);
  }
}

// ─── Policy Builder — Fluent API for defining permissions ─────────────────────

export class PolicyBuilder {
  private permissions: Permission[] = [];

  allow(action: Action | Action[], resource: Resource | Resource[], condition?: Permission["condition"]): this {
    const actions    = Array.isArray(action)   ? action   : [action];
    const resources  = Array.isArray(resource) ? resource : [resource];
    for (const a of actions) {
      for (const r of resources) {
        this.permissions.push({ action: a, resource: r, ...(condition ? { condition } : {}) });
      }
    }
    return this;
  }

  allowAll(resource: Resource | Resource[]): this {
    return this.allow("*", resource);
  }

  build(): Permission[] {
    return [...this.permissions];
  }
}

export function policy(): PolicyBuilder {
  return new PolicyBuilder();
}

// ─── React Integration ────────────────────────────────────────────────────────

import React, { createContext, useContext, ReactNode } from "react";

interface PermissionContextValue {
  engine:  PermissionEngine;
  context: AuthContext;
  can:     (action: Action, resource: Resource) => boolean;
  cannot:  (action: Action, resource: Resource) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  engine:  new PermissionEngine(),
  context: { roles: [] },
  can:     () => false,
  cannot:  () => true,
});

export const usePermission = () => useContext(PermissionContext);

interface PermissionProviderProps {
  engine:   PermissionEngine;
  context:  AuthContext;
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ engine, context, children }) => (
  <PermissionContext.Provider value={{
    engine,
    context,
    can:    (a, r) => engine.can(context, a, r),
    cannot: (a, r) => engine.cannot(context, a, r),
  }}>
    {children}
  </PermissionContext.Provider>
);

// Gate component — renders children only if permission passes
interface GateProps {
  action:    Action;
  resource:  Resource;
  fallback?: ReactNode;
  children:  ReactNode;
}

export const Gate: React.FC<GateProps> = ({ action, resource, fallback = null, children }) => {
  const { can } = usePermission();
  return <>{can(action, resource) ? children : fallback}</>;
};

// ─── Middleware helper (Node.js / Next.js API routes) ─────────────────────────

export function createAuthGuard(engine: PermissionEngine) {
  return function guard(action: Action, resource: Resource) {
    return function middleware(
      handler: (ctx: AuthContext, ...args: unknown[]) => unknown
    ) {
      return (authContext: AuthContext, ...args: unknown[]) => {
        if (engine.cannot(authContext, action, resource)) {
          throw Object.assign(new Error("Forbidden"), { statusCode: 403, code: "FORBIDDEN" });
        }
        return handler(authContext, ...args);
      };
    };
  };
}

/*
 * Usage Examples:
 *
 * const engine = new PermissionEngine();
 *
 * engine.registerRoles([
 *   { name: "viewer", permissions: policy().allow("read", ["post", "comment"]).build() },
 *   {
 *     name: "editor",
 *     inherits: ["viewer"],
 *     permissions: policy()
 *       .allow(["create", "update"], "post")
 *       // Can only delete their own posts
 *       .allow("delete", "post", (ctx) => ctx.ownerId === ctx.userId)
 *       .build(),
 *   },
 *   { name: "admin",  permissions: policy().allowAll("*").build() },
 * ]);
 *
 * const ctx: AuthContext = { userId: "u1", roles: ["editor"], ownerId: "u1" };
 * engine.can(ctx, "delete", "post");   // true (owns it)
 * engine.can(ctx, "delete", "user");   // false
 *
 * // React Gate
 * <Gate action="delete" resource="post" fallback={<Tooltip>No permission</Tooltip>}>
 *   <DeleteButton />
 * </Gate>
 */
