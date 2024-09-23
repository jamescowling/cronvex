import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { JobWithCron } from "../../convex/cronvex";

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

const columns: ColumnDef<JobWithCron>[] = [
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
  const jobs = useQuery(api.cronvex.listJobs) ?? [];
  const deleteJobs = useMutation(api.cronvex.deleteJobs);

  function getRowId(row: JobWithCron): string {
    return row._id;
  }

  async function deleteBatch(ids: string[]) {
    await deleteJobs({ ids: ids as Id<"requests">[] });
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crons</CardTitle>
          <CardDescription>Currently registered cron jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Register />
          <DataTable
            columns={columns}
            data={jobs}
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
