<!-- @keywords: shadcn, form, react-hook-form, zod, data table, command palette, theme, dark mode, extend component -->
<!-- @domain: shadcn/ui — Workflows & Common Patterns -->

# shadcn/ui — Workflows & Common Patterns

## Forms with react-hook-form + zod

The canonical shadcn form pattern — install dependencies first:

```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn@latest add form input label
```

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    // values is type-safe and validated
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />  {/* shows validation error */}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>Minimum 8 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Data Tables with TanStack Table

```bash
npx shadcn@latest add table
npm install @tanstack/react-table
```

```tsx
"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type User = { id: string; name: string; email: string; role: string };

const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="capitalize">{row.getValue("role")}</span>
    ),
  },
];

export function UsersTable({ data }: { data: User[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search users..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Command Palette

```bash
npx shadcn@latest add command dialog
```

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => navigate("/dashboard")}>Dashboard</CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>Settings</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { /* open new post dialog */ }}>New Post</CommandItem>
          <CommandItem onSelect={() => { /* logout */ }}>Log out</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

---

## Toast Notifications

```bash
npx shadcn@latest add sonner
```

```tsx
// app/layout.tsx — add once
import { Toaster } from "@/components/ui/sonner";

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
```

```tsx
// In any component
import { toast } from "sonner";

// Success
toast.success("Profile updated successfully");

// Error
toast.error("Failed to save changes", {
  description: "Please check your connection and try again",
});

// Promise (shows loading → success/error)
toast.promise(
  fetch('/api/submit').then(r => r.json()),
  {
    loading: "Submitting...",
    success: "Submitted!",
    error: "Submission failed",
  }
);

// Action button
toast("New comment on your post", {
  action: {
    label: "View",
    onClick: () => router.push('/posts/123'),
  },
});
```

---

## Sheet (Side Panel)

```bash
npx shadcn@latest add sheet
```

```tsx
import {
  Sheet, SheetContent, SheetDescription,
  SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Filters</Button>
  </SheetTrigger>
  <SheetContent side="right">  {/* left | right | top | bottom */}
    <SheetHeader>
      <SheetTitle>Filter Results</SheetTitle>
      <SheetDescription>Narrow down your search</SheetDescription>
    </SheetHeader>
    {/* filter form here */}
  </SheetContent>
</Sheet>
```

---

## Extending Components with Custom Variants

```tsx
// Add a "brand" variant to Button without modifying the source file
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Method 1 — wrapper component with additional props
export function BrandButton({ className, ...props }) {
  return (
    <Button
      className={cn("bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700", className)}
      {...props}
    />
  );
}

// Method 2 — modify buttonVariants in button.tsx directly
// In components/ui/button.tsx, add to the variants object:
variants: {
  variant: {
    // ... existing variants ...
    brand: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700",
  },
}
```
