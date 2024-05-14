import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { Id } from "convex/_generated/dataModel";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "./ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Register } from "./Register";

// TODO: remove duplication
type WebhookWithCronspec = {
  _id: Id<"webhooks">;
  _creationTime: number;
  name?: string | undefined;
  method?: string | undefined;
  headers?: string | undefined;
  body?: string | undefined;
  cron?: Id<"crons"> | undefined;
  url: string;
  cronspec?: string;
};

const columns: ColumnDef<WebhookWithCronspec>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  { accessorKey: "cronspec", header: "Cronspec" },
  {
    accessorKey: "url",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          URL
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  { accessorKey: "method", header: "Method" },
  { accessorKey: "headers", header: "Headers" },
  { accessorKey: "body", header: "Body" },
];

export function Crons() {
  const crons = useQuery(api.demo.listWebhooks) ?? [];

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Crons</CardTitle>
          <CardDescription>Currently registered cron jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Register />
          <div className="mx-auto py-10">
            <DataTable columns={columns} data={crons} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
