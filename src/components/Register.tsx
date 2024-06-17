import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import { FormEvent, useCallback, useState } from "react";
import { SignIn } from "./Profile";
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
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const days: Day[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface FormData {
  url: string;
  cronspec: string;
  name: string;
  method: string;
  headers: string;
  body: string;
  scheduleType: "hourly" | "daily" | "monthly" | "cronly";
  hourlyInterval: number;
  hourlyOffset: number;
  dailyTime: string;
  dailyDays: { [key in Day]: boolean };
  monthlyDay: number;
  monthlyTime: string;
}

const initialFormData: FormData = {
  url: "",
  cronspec: "",
  name: "",
  method: "POST",
  headers: "",
  body: "",
  scheduleType: "daily",
  hourlyInterval: 1,
  hourlyOffset: 0,
  dailyTime: "12:00",
  dailyDays: days.reduce(
    (acc, day) => ({ ...acc, [day]: true }),
    {} as { [key in Day]: boolean }
  ),
  monthlyDay: 1,
  monthlyTime: "12:00",
};

export function Register() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const registerJob = useMutation(api.cronvex.registerJob);

  const handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { name, value, type } = event.target;
    if (type === "checkbox") {
      const checked = (event.target as HTMLInputElement).checked;
      setFormData((prevFormData) => ({
        ...prevFormData,
        dailyDays: {
          ...prevFormData.dailyDays,
          [name]: checked,
        },
      }));
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: value,
      }));
    }
  };

  const parseTime = (time: string) => {
    const [hour, minute] = time.split(":");
    return [hour, parseInt(minute, 10), toString()];
  };

  const handleRegisterCron = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (formData.scheduleType === "cronly" && !formData.cronspec) {
        setError("Cron spec is required when using Cron Expression");
        return;
      }

      setError(null);

      const [dailyHour, dailyMinute] = parseTime(formData.dailyTime);
      const [monthlyHour, monthlyMinute] = parseTime(formData.monthlyTime);
      const dailyDaysStr = Object.keys(formData.dailyDays)
        .filter((day) => formData.dailyDays[day as Day])
        .map((day) => days.indexOf(day as Day))
        .join(",");

      // TODO do this on onChange
      let cronspec = formData.cronspec;
      switch (formData.scheduleType) {
        case "hourly":
          cronspec = `${formData.hourlyOffset} */${formData.hourlyInterval} * * *`;
          break;
        case "daily":
          cronspec = `${dailyMinute} ${dailyHour} * * ${dailyDaysStr}`;
          break;
        case "monthly":
          cronspec = `${monthlyMinute} ${monthlyHour} ${formData.monthlyDay} * *`;
          break;
        case "cronly":
          break;
      }

      const registrationState = {
        name: formData.name,
        headers: formData.headers,
        body: formData.body,
        cronspec: cronspec,
        url: formData.url,
        method: formData.method,
      };

      console.log("Registering cron with state:", registrationState);

      try {
        await registerJob(registrationState);
        setFormData(initialFormData);
        setOpen(false);
      } catch (err) {
        setError("Failed to register cron");
        console.error("Failed to register cron:", err);
      }
    },
    [formData, registerJob]
  );

  const { isAuthenticated } = useConvexAuth();

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

            <div className="space-y-6 py-6">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-baseline gap-4">
                  <Label htmlFor="url" className="text-right">
                    URL
                  </Label>
                  <Input
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    placeholder="https://example.com/chat"
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-baseline gap-4">
                  <Label className="text-right">Schedule</Label>
                  <Tabs
                    defaultValue={formData.scheduleType}
                    className="col-span-3 rounded-lg border"
                    onValueChange={(value) =>
                      setFormData((prevFormData) => ({
                        ...prevFormData,
                        scheduleType: value as FormData["scheduleType"],
                      }))
                    }
                  >
                    <TabsList className="flex justify-between">
                      <TabsTrigger value="hourly">Hourly</TabsTrigger>
                      <TabsTrigger value="daily">Daily</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="cronly">Cron Expression</TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col px-6 py-2">
                      <TabsContent value="hourly">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <Label
                              htmlFor="hourlyInterval"
                              className="flex font-normal"
                            >
                              Every
                            </Label>
                            <Input
                              className="w-16"
                              type="number"
                              min="1"
                              max="24"
                              id="hourlyInterval"
                              name="hourlyInterval"
                              value={formData.hourlyInterval}
                              onChange={handleChange}
                            />
                            <div className="text-sm">hour(s)</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Label
                              htmlFor="hourlyOffset"
                              className="flex  font-normal"
                            >
                              at
                            </Label>
                            <Input
                              className="w-16"
                              type="number"
                              min="0"
                              max="59"
                              id="hourlyOffset"
                              name="hourlyOffset"
                              value={formData.hourlyOffset}
                              onChange={handleChange}
                            />
                            <div className="text-sm">minutes past the hour</div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="daily">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-4">
                            <Label className="font-normal">Every</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {days.map((day) => (
                                <div
                                  className="flex items-center space-x-2"
                                  key={day}
                                >
                                  <input
                                    className="peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                    type="checkbox"
                                    id={day}
                                    name={day}
                                    checked={formData.dailyDays[day]}
                                    onChange={handleChange}
                                  />
                                  <label htmlFor={day} className="text-sm">
                                    {day.slice(0, 3)}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Label htmlFor="dailyTime" className="font-normal">
                              at
                            </Label>
                            <Input
                              className="w-auto"
                              type="time"
                              id="dailyTime"
                              name="dailyTime"
                              value={formData.dailyTime}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="monthly">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <Label htmlFor="monthlyDay" className="font-normal">
                              Day of month
                            </Label>
                            <Input
                              className="w-16"
                              type="number"
                              min="1"
                              max="31"
                              id="monthlyDay"
                              name="monthlyDay"
                              value={formData.monthlyDay}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <Label
                              htmlFor="monthlyTime"
                              className="font-normal"
                            >
                              Time
                            </Label>
                            <Input
                              className="w-auto"
                              type="time"
                              id="monthlyTime"
                              name="monthlyTime"
                              value={formData.monthlyTime}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="cronly">
                        <div className="flex items-center gap-4">
                          <Label htmlFor="cronspec" className="font-normal">
                            Cron
                          </Label>
                          <Input
                            className="w-auto"
                            id="cronspec"
                            name="cronspec"
                            value={formData.cronspec}
                            onChange={handleChange}
                            placeholder="0 9 * * 1-5"
                            required={formData.scheduleType === "cronly"}
                          />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>

                <div className="grid grid-cols-4 items-baseline gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name (optional)
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="my-annoying-chat-bot"
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-baseline gap-4">
                  <Label htmlFor="method" className="text-right">
                    Method
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

                <div className="grid grid-cols-4 items-baseline gap-4">
                  <Label htmlFor="headers" className="text-right">
                    Headers (optional)
                  </Label>
                  <Textarea
                    id="headers"
                    name="headers"
                    value={formData.headers}
                    onChange={handleChange}
                    placeholder={`{ "Content-Type": "application/json" }`}
                    className="col-span-3"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-4 items-baseline gap-4">
                  <Label htmlFor="body" className="text-right">
                    Body (optional)
                  </Label>
                  <Textarea
                    id="body"
                    name="body"
                    value={formData.body}
                    onChange={handleChange}
                    placeholder={`{ "author": "Mr. Roboto",\n"body": "Domo arigato!" }`}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="grid grid-cols-4 items-center gap-4">
              <div className="text-left text-red-500 col-span-3">
                {isAuthenticated ? error : "Must be signed in to add a cron."}
              </div>
              <Authenticated>
                <Button
                  type="submit"
                  className="col-span-1"
                  disabled={
                    !formData.url ||
                    (formData.scheduleType === "cronly" &&
                      !formData.cronspec) ||
                    !formData.method ||
                    !isAuthenticated
                  }
                >
                  Register cron
                </Button>
              </Authenticated>
              <Unauthenticated>
                <SignIn />
              </Unauthenticated>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
