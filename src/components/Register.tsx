import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChangeEvent, FormEvent, useCallback, useState } from "react";
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
import { Checkbox } from "./ui/checkbox";

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
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Schedule</Label>
                  <Tabs
                    defaultValue={formData.scheduleType}
                    className="w-[400px] rounded-lg border"
                    onValueChange={(value) =>
                      setFormData((prevFormData) => ({
                        ...prevFormData,
                        scheduleType: value as FormData["scheduleType"],
                      }))
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="hourly">Hourly</TabsTrigger>
                      <TabsTrigger value="daily">Daily</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="cronly">Cron Expression</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hourly">
                      <div className="flex flex-row p-2 gap-4">
                        <div>
                          <Label htmlFor="hourlyInterval">Every</Label>
                          <Input
                            type="number"
                            id="hourlyInterval"
                            name="hourlyInterval"
                            value={formData.hourlyInterval}
                            onChange={handleChange}
                          />
                        </div>
                        hours at
                        <div>
                          <Input
                            type="number"
                            id="hourlyOffset"
                            name="hourlyOffset"
                            value={formData.hourlyOffset}
                            onChange={handleChange}
                          />
                          <Label htmlFor="hourlyOffset">
                            minutes past the hour
                          </Label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="daily">
                      <div className="flex flex-row p-2 gap-4">
                        <div>
                          <Label>Days</Label>
                          <div className="columns-3">
                            {days.map((day) => (
                              <div
                                className="flex items-center space-x-2"
                                key={day}
                              >
                                <label htmlFor={day} className="text-sm">
                                  <input
                                    type="checkbox"
                                    id={day}
                                    name={day}
                                    checked={formData.dailyDays[day]}
                                    onChange={handleChange}
                                  />
                                  {day}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="dailyTime">Time</Label>
                          <Input
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
                      <div className="flex flex-row p-2 gap-4">
                        <div>
                          <Label htmlFor="monthlyDay">Day of month</Label>
                          <Input
                            type="number"
                            id="monthlyDay"
                            name="monthlyDay"
                            value={formData.monthlyDay}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <Label htmlFor="monthlyTime">Time</Label>
                          <Input
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
                      <Label htmlFor="cronspec">Cronspec</Label>
                      <Input
                        id="cronspec"
                        name="cronspec"
                        value={formData.cronspec}
                        onChange={handleChange}
                        placeholder="* * * * *"
                      />
                    </TabsContent>
                  </Tabs>
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

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="headers" className="text-right">
                    Headers (optional)
                  </Label>
                  <Textarea
                    id="headers"
                    name="headers"
                    value={formData.headers}
                    onChange={handleChange}
                    placeholder={`"Content-Type": "application/json"`}
                    className="col-span-3"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="body" className="text-right">
                    Body (optional)
                  </Label>
                  <Textarea
                    id="body"
                    name="body"
                    value={formData.body}
                    onChange={handleChange}
                    placeholder={`"author": "User 123",\n"body": "Hello world"`}
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
                    !formData.cronspec ||
                    !formData.method ||
                    !isAuthenticated
                  }
                >
                  Register cron
                </Button>
              </Authenticated>
              <Unauthenticated>
                <SignIn />
                <Button type="submit" className="col-span-1">
                  Delete me
                </Button>
              </Unauthenticated>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
