<!-- @keywords: TypeScript compiler, ts-morph, AST manipulation, custom transformer, language service plugin, programmatic type checking, compile API, code generation, TypeScript plugin, transform -->

# TypeScript Expert — TypeScript Compiler as Programmable Tool

## Core Philosophy

The TypeScript compiler is not just a type checker — it is a programmable transformation pipeline. ts-morph provides a full AST manipulation API. Custom transformers run during compilation. Language service plugins extend the IDE experience. These are tools for the 1% of cases where the type system alone is insufficient.

Use the compiler API when you need to: enforce patterns that ESLint can't express, generate typed code from external schemas, or build domain-specific IDE tooling.

---

## When to Activate

- Generating TypeScript interfaces from database schemas, OpenAPI specs, or GraphQL schemas
- Enforcing project-specific patterns that ESLint rules can't express
- Building code migrations that must be type-aware
- Creating IDE plugins that provide domain-specific autocomplete

---

## Principles

### ts-morph: The Practical AST API
ts-morph wraps the TypeScript compiler API in a clean, maintainable interface:

```ts
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json'
});

// Find all functions without explicit return types
const sourceFiles = project.getSourceFiles('src/**/*.ts');

for (const file of sourceFiles) {
  const functions = file.getFunctions();
  
  for (const fn of functions) {
    if (!fn.getReturnTypeNode()) {
      const inferredType = fn.getReturnType().getText();
      fn.setReturnType(inferredType);
      console.log(`Added return type to ${fn.getName()} in ${file.getBaseName()}`);
    }
  }
}

await project.save();
```

---

### Custom Transformer
Transformers run during compilation and can rewrite AST nodes:

```ts
import ts from 'typescript';

// Transformer: automatically add null checks for database query results
function addNullCheckTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const typeChecker = program.getTypeChecker();
  
  return (context) => (sourceFile) => {
    function visitor(node: ts.Node): ts.Node {
      // Find: const result = await db.query(...)
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isAwaitExpression(node.initializer)
      ) {
        const type = typeChecker.getTypeAtLocation(node.initializer);
        const typeName = typeChecker.typeToString(type);
        
        // If return type is T | null, add assertion
        if (typeName.includes('| null')) {
          // Wrap initializer: (await db.query(...)) ?? throwIfNull()
          const newInit = ts.factory.createBinaryExpression(
            node.initializer,
            ts.SyntaxKind.QuestionQuestionToken,
            ts.factory.createCallExpression(
              ts.factory.createIdentifier('throwIfNull'),
              undefined,
              []
            )
          );
          return ts.factory.updateVariableDeclaration(
            node,
            node.name,
            node.exclamationToken,
            node.type,
            newInit
          );
        }
      }
      return ts.visitEachChild(node, visitor, context);
    }
    
    return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
  };
}
```

---

### Programmatic Type Checking
Run the type checker programmatically to build validation tools:

```ts
import ts from 'typescript';

function checkFileForAnyTypes(filePath: string): string[] {
  const program = ts.createProgram([filePath], {
    strict: true,
    noImplicitAny: true,
  });

  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(filePath);
  const violations: string[] = [];

  if (!sourceFile) return violations;

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      const type = checker.getTypeAtLocation(node);
      if (type.flags & ts.TypeFlags.Any) {
        const { line } = sourceFile!.getLineAndCharacterOfPosition(node.getStart());
        violations.push(`Line ${line + 1}: implicit 'any' type on '${node.getText()}'`);
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return violations;
}
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Using ts-morph for simple text transformations that regex handles fine
- Custom transformers for patterns that conditional types can express
- Language service plugins that make the IDE slow — measure before shipping
- Transformers that produce code other developers can't debug

---

## Example in Action

Transformer that automatically adds exhaustive null checks:

```ts
// scripts/add-null-checks.ts — run with: npx ts-node scripts/add-null-checks.ts
import { Project, SyntaxKind, Node } from 'ts-morph';
import path from 'path';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  addFilesFromTsConfig: true,
});

let totalFixed = 0;

for (const sourceFile of project.getSourceFiles('src/**/*.ts')) {
  let fileFixed = 0;

  // Find all non-null assertions (!) — potential crashes
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.NonNullExpression) {
      const inner = (node as any).getExpression();
      const type = inner.getType();
      
      // Only flag if the base type actually includes null/undefined
      if (type.isNullable()) {
        const parent = node.getParent();
        const pos = node.getStartLineNumber();
        
        console.log(`${sourceFile.getBaseName()}:${pos} — non-null assertion on nullable type`);
        console.log(`  Consider: if (!${inner.getText()}) throw new Error('...')`);
        fileFixed++;
      }
    }
  });

  // Find assignments where RHS can be undefined but LHS type doesn't include it
  sourceFile.getVariableDeclarations().forEach((decl) => {
    const init = decl.getInitializer();
    if (!init) return;

    const initType = init.getType();
    const declType = decl.getType();

    if (initType.isNullable() && !declType.isNullable()) {
      const line = decl.getStartLineNumber();
      console.log(`${sourceFile.getBaseName()}:${line} — assigning nullable to non-nullable`);
      fileFixed++;
    }
  });

  totalFixed += fileFixed;
}

console.log(`\nFound ${totalFixed} potential null safety issues across ${project.getSourceFiles().length} files`);
console.log('Review each location and add explicit null guards or adjust types.');
```

**Output:**
```
auth/auth.service.ts:47 — non-null assertion on nullable type
  Consider: if (!user) throw new Error('User not found')
api/api.client.ts:89 — assigning nullable to non-nullable

Found 2 potential null safety issues across 24 files
```
