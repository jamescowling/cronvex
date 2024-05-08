import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { FormEvent, useState } from "react";

export default function App() {
  const crons = useQuery(api.demo.listCrons) ?? [];
  const syslog = useQuery(api.demo.tailSyslog) ?? [];

  const [cronspec, setCronspec] = useState("* * * * *");
  const [message, setMessage] = useState("");
  const echo = useMutation(api.demo.echo);

  async function handleEcho(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await echo({ message: message, cronspec: cronspec });
    } catch (error) {
      console.error("Failed to add cron:", error);
    }
  }

  return (
    <main className="container max-w-2xl flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold font-mono my-8">
          $ cronvex<span className="animate-blink">_</span>
        </h1>
      </div>

      <div className="bg-foreground text-background p-4 rounded-md font-mono">
        <pre>
          <code>
            <div>
              <span className="text-lime-500">cronvex</span>:
              <span className="text-sky-400">~</span>$ crontab -e
            </div>
            <div className="flex items-center">
              <form onSubmit={handleEcho}>
                <input
                  value={cronspec}
                  onChange={(event) => setCronspec(event.target.value)}
                  placeholder="* * * * *"
                  className="w-32 text-black"
                />
                <span> echo "</span>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a message…"
                  className="text-black"
                />
                <span>"</span>
                <input type="submit" value="Send" disabled={!message} hidden />
              </form>
            </div>
            <div>...</div>
          </code>
        </pre>
      </div>

      <div className="bg-black text-white p-4 rounded-md font-mono">
        <pre>
          <code>
            <div>
              <span className="text-lime-500">cronvex</span>:
              <span className="text-sky-400">~</span>$ crontab -l
            </div>
            <div># m h dom mon dow command</div>
            {crons.map((cron, index) => (
              <div key={index}>
                {cron.cronspec} {cron.function}("{cron.args.message}")
              </div>
            ))}
          </code>
        </pre>
      </div>

      <div className="bg-black text-white p-4 rounded-md font-mono">
        <pre>
          <code>
            <div>
              <span className="text-lime-500">cronvex</span>:
              <span className="text-sky-400">~</span>$ tail -f /var/log/syslog
            </div>
            <div>...</div>
            {syslog.map((log, index) => (
              <div key={index}>
                {log.time}: {log.message}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </main>
  );
}
