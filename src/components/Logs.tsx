import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

import { formatDate } from "../utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";

export function Logs() {
  const logs = useQuery(api.cronvex.tailLogs) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Logs</CardTitle>
        <CardDescription>Cron execution logs.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Headers</TableCell>
              <TableCell>Body</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Response</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length ? (
              logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(log._creationTime)}</TableCell>
                  <TableCell>{log.url}</TableCell>
                  <TableCell>{log.method}</TableCell>
                  <TableCell>{log.headers}</TableCell>
                  <TableCell>{log.body}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>{log.response}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No messages sent.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
