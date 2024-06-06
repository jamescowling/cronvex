import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Checkbox } from "@/components/ui/checkbox";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { Register } from "./Register";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

// TODO: remove duplication
export type WebhookWithCronspec = {
  _id: Id<"webhooks">;
  _creationTime: number;
  name?: string | undefined;
  method: string;
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
  const crons = useQuery(api.cronvex.listWebhooks) ?? [];
  const deleteCrons = useMutation(api.cronvex.deleteCrons);

  function getRowId(row: WebhookWithCronspec): string {
    return (row as WebhookWithCronspec)._id;
  }

  async function deleteBatch(ids: string[]) {
    await deleteCrons({ ids: ids as Id<"webhooks">[] });
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Crons</CardTitle>
          <CardDescription>Currently registered cron jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Register />
          <DataTable
            columns={columns}
            data={crons}
            visibility={{
              method: false,
              headers: false,
              body: false,
            }}
            getRowId={getRowId}
            deleteBatch={deleteBatch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
