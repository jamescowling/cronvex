import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";

export function Crons() {
  const crons = useQuery(api.demo.listWebhooks) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crons</CardTitle>
        <CardDescription>Currently registered cron jobs.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Cronspec</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Headers</TableCell>
              <TableCell>Body</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {crons.map((cron, index) => (
              <TableRow key={index}>
                <TableCell>{cron.name}</TableCell>
                <TableCell>{cron.cronspec}</TableCell>
                <TableCell>{cron.url}</TableCell>
                <TableCell>{cron.method}</TableCell>
                <TableCell>{cron.headers}</TableCell>
                <TableCell>{cron.body}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
