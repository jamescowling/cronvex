import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { FormEvent, useCallback, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

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
  const [open, setOpen] = useState(false);

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
        setOpen(false);
      } catch (err) {
        setError("Failed to register cron");
        console.error("Failed to register cron:", err);
      }
    },
    [formData, registerCron]
  );

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add a cron</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleRegisterCron}>
            <DialogHeader>
              <DialogTitle>Add Cron</DialogTitle>
              <DialogDescription>
                Register a URL to call on a given schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">
                    URL
                  </Label>
                  <Input
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="https://honorable-panther-344.convex.site/log"
                    required
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cronspec" className="text-right">
                    Cronspec
                  </Label>
                  <Input
                    id="cronspec"
                    name="cronspec"
                    value={formData.cronspec}
                    onChange={handleChange}
                    placeholder="* * * * *"
                    required
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name (optional)
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="my cool cron"
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="method" className="text-right">
                    Method (optional)
                  </Label>
                  <Input
                    id="method"
                    name="method"
                    value={formData.method}
                    onChange={handleChange}
                    placeholder="POST"
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="headers" className="text-right">
                    Headers (optional)
                  </Label>
                  <Input
                    id="headers"
                    name="headers"
                    value={formData.headers}
                    onChange={handleChange}
                    placeholder='{ "Content-Type": "application/json", ... }'
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="body" className="text-right">
                    Body (optional)
                  </Label>
                  <Input
                    id="body"
                    name="body"
                    value={formData.body}
                    onChange={handleChange}
                    placeholder='{ "author": "User 123", "body": "Hello world" }'
                    className="col-span-3"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="grid grid-cols-4 items-center gap-4">
              <div className="text-left text-red-500 col-span-3">{error}</div>
              <Button
                type="submit"
                className="col-span-1"
                disabled={!formData.url}
              >
                Register cron
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
