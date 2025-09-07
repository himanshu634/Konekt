"use client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@konekt/ui/form";
import { Input } from "@konekt/ui/input";
import { Button } from "@konekt/ui/button";
import { useForm } from "react-hook-form";
import { useLocalStorage } from "usehooks-ts";
import { USER_GAME_PREFERENCE, USER_NAME_KEY } from "lib/constant";
import { useRouter } from "next/navigation";
import { PATHS } from "lib/paths";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@konekt/ui/select";

type UserGamePreferenceType = "chess" | "tic-tac-toe" | "";

export function NameInput() {
  const [userName, setUserName] = useLocalStorage<string | undefined>(
    USER_NAME_KEY,
    ""
  );
  const [gamePreference, setGamePreference] =
    useLocalStorage<UserGamePreferenceType>(USER_GAME_PREFERENCE, "");

  const form = useForm<{
    name: string;
    gamePreference: UserGamePreferenceType;
  }>({ defaultValues: { name: userName, gamePreference: gamePreference } });
  const router = useRouter();

  function onSubmit(values: {
    name: string;
    gamePreference: UserGamePreferenceType;
  }) {
    if (values.name && values.name.length >= 3 && values.gamePreference) {
      setUserName(values.name);
      setGamePreference(values.gamePreference);
      router.push(PATHS.PLAYGROUND);
    } else if (values.name && values.name.length < 3) {
      form.setError("name", {
        type: "manual",
        message: "Name must be at least 3 characters long",
      });
      return;
    } else if (!values.name) {
      form.setError("name", {
        type: "manual",
        message: "Name is required",
      });
      return;
    } else {
      form.setError("gamePreference", {
        type: "manual",
        message: "Please select game!",
      });
    }
    // router.push(PATHS.PLAYGROUND + `?name=${encodeURIComponent(values.name)}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xl">Name</FormLabel>
              <FormControl>
                <Input
                  className="w-full sm:w-96! text-lg sm:text-4xl! h-12 sm:h-20"
                  placeholder="Enter your name"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gamePreference"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full sm:w-96! text-xl sm:text-4xl! h-fit py-2 sm:py-5!">
                    <SelectValue
                      placeholder="Choose Your Game"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Games</SelectLabel>
                      <SelectItem value="chess">Chess</SelectItem>
                      <SelectItem value="tic-tac-toe">Tic Tac Toe</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end mt-6">
          <Button size="lg" type="submit" variant="outline">
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
