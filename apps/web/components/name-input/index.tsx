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
import { USER_NAME_KEY } from "lib/constant";
import { useRouter } from "next/navigation";
import { PATHS } from "lib/paths";

export function NameInput() {
  const [userName, setUserName] = useLocalStorage<string | undefined>(
    USER_NAME_KEY,
    undefined
  );

  const form = useForm<{ name: string }>({ defaultValues: { name: userName } });
  const router = useRouter();

  function onSubmit(values: { name: string }) {
    if (values.name && values.name.length >= 3) {
      setUserName(values.name);
      router.push(PATHS.PLAYGROUND);
    } else if (values.name && values.name.length < 3) {
      form.setError("name", {
        type: "manual",
        message: "Name must be at least 3 characters long",
      });
      return;
    } else {
      form.setError("name", {
        type: "manual",
        message: "Name is required",
      });
      return;
    }
    // router.push(PATHS.PLAYGROUND + `?name=${encodeURIComponent(values.name)}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        <div className="flex justify-end">
          <Button size="lg" type="submit" variant="outline">
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
