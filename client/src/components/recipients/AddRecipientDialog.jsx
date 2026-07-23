import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useCreateRecipient } from "../../lib/queries/recipients";
import { addRecipientSchema } from "../../lib/schemas/recipientSchemas";
import { FormError } from "../form/FormError";
import { Loader2, UserPlus } from "lucide-react";
import { PhoneInput } from "../shared/CustomPhoneInput";

export function AddRecipientDialog({ open, onOpenChange, surveyId }) {
  const { mutate: createRecipient, isPending } = useCreateRecipient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(addRecipientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = (data) => {
    createRecipient(
      { surveyId, data },
      {
        onSuccess: () => {
          reset();
          // Small delay to ensure the query invalidation has completed before closing
          setTimeout(() => {
            onOpenChange(false);
          }, 100);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Recipient</DialogTitle>
          <DialogDescription>
            Add a single recipient to the survey whitelist
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" {...register("name")} />
            <FormError error={errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <PhoneInput
                  id="phone"
                  placeholder="254712345678"
                  fieldState={fieldState}
                  international
                  defaultCountry="KE"
                  limitMaxLength
                  className="w-full"
                  {...field}
                />
              )}
            />
            <FormError error={errors.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
            />
            <FormError error={errors.email} />
          </div>

          <p className="text-xs text-gray-500">
            * At least one contact method (phone or email) is required
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Recipient
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
