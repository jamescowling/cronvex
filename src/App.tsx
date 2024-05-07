import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { FormEvent, useState } from "react";

export default function App() {
  return (
    <main className="container max-w-2xl flex flex-col gap-8">
      <Authenticated>
        <SignedIn />
      </Authenticated>
      <Unauthenticated>
        <div className="flex justify-center">
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </Unauthenticated>
    </main>
  );
}

function SignedIn() {
  const { user } = useUser();
  const username = user?.firstName?.toLowerCase();

  const crons = useQuery(api.demo.listCrons) ?? [];
  const syslog = useQuery(api.demo.tailSyslog) ?? [];

  const [message, setMessage] = useState("");
  const addCron = useMutation(api.demo.addCron);

  async function handleAddCron(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await addCron({ message: message, cronspec: "* * * * *" });
    } catch (error) {
      console.error("Failed to add cron:", error);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold font-mono my-8">
          $ cronvex<span className="animate-blink">_</span>
        </h1>
        <div className="flex gap-4">
          <UserButton afterSignOutUrl="#" />
        </div>
      </div>

      <div className="bg-foreground text-background p-4 rounded-md font-mono">
        <pre>
          <code>
            <div>
              <span className="text-lime-500">{username}@cronvex</span>:
              <span className="text-sky-400">~</span>$ crontab -e
            </div>
            <div className="flex items-center">
              <span>* * * * * echo "</span>
              <form onSubmit={handleAddCron} className="text-black">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a message…"
                />
                <input type="submit" value="Send" disabled={!message} hidden />
              </form>
              <span>"</span>
            </div>
            <div>...</div>
          </code>
        </pre>
      </div>

      <div className="bg-black text-white p-4 rounded-md font-mono">
        <pre>
          <code>
            <div>
              <span className="text-lime-500">{username}@cronvex</span>:
              <span className="text-sky-400">~</span>$ crontab -l
            </div>
            <div># m h dom mon dow command</div>
            {crons.map((cron, index) => (
              <div key={index}>
                {cron.cronspec} echo "{cron.message}"
              </div>
            ))}
          </code>
        </pre>
      </div>

      <div className="bg-black text-white p-4 rounded-md font-mono">
        <pre>
          <code>
            <div>
              <span className="text-lime-500">{username}@cronvex</span>:
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
    </>
  );
}
