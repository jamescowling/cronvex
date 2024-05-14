import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { FormEvent, useCallback, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function Register() {
  const [formData, setFormData] = useState({
    url: "",
    cronspec: "",
    name: "",
    method: "",
    headers: "",
    body: "",
  });

  const [error, setError] = useState<string | null>(null);

  const registerCron = useMutation(api.demo.registerCron);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleRegisterCron = useCallback(
    async (event: FormEvent) => {
      console.log("register", event);
      console.log("formData", formData);
      event.preventDefault();
      setError(null);

      try {
        await registerCron(formData);
        setFormData({
          url: "",
          cronspec: "",
          name: "",
          method: "",
          headers: "",
          body: "",
        });
      } catch (err) {
        setError("Failed to register cron");
        console.error("Failed to register cron:", err);
      }
    },
    [formData, registerCron]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create cron job</CardTitle>
        <CardDescription>
          Register a URL and optional parameters to call on a given schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegisterCron} className="space-y-4">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://honorable-panther-344.convex.site/log"
              required
            />
          </div>
          <div>
            <Label htmlFor="cronspec">Cronspec</Label>
            <Input
              id="cronspec"
              name="cronspec"
              value={formData.cronspec}
              onChange={handleChange}
              placeholder="* * * * *"
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="my cool cron"
            />
          </div>
          <div>
            <Label htmlFor="method">Method (optional)</Label>
            <Input
              id="method"
              name="method"
              value={formData.method}
              onChange={handleChange}
              placeholder="POST"
            />
          </div>
          <div>
            <Label htmlFor="headers">Headers (optional)</Label>
            <Input
              id="headers"
              name="headers"
              value={formData.headers}
              onChange={handleChange}
              placeholder='{ "Content-Type": "application/json", ... }'
            />
          </div>
          <div>
            <Label htmlFor="body">Body (optional)</Label>
            <Input
              id="body"
              name="body"
              value={formData.body}
              onChange={handleChange}
              placeholder='{ "author": "User 123", "body": "Hello world" }'
            />
          </div>
          <Button type="submit" disabled={!formData.url}>
            Register Cron
          </Button>
          {error && <p className="text-red-500">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
