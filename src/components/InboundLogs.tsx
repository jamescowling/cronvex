import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDate } from "../utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./ui/table";
import { webhookUrl } from "@/App";

export function InboundLogs() {
  const logs = useQuery(api.weblogs.tailInbound) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbound web logs</CardTitle>
        <CardDescription>
          Inbound http requests to the sample endpoint {webhookUrl()}.
        </CardDescription>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={index}>
                <TableCell>{formatDate(log._creationTime)}</TableCell>
                <TableCell>{log.url}</TableCell>
                <TableCell>{log.method}</TableCell>
                <TableCell>{log.headers}</TableCell>
                <TableCell>{log.body}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
