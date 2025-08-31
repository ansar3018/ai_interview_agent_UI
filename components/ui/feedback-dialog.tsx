
import * as React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function FeedbackDialog({ triggerLabel = "Give Feedback", className }: { triggerLabel?: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // TODO: Integrate with backend API
    setTimeout(() => {
      setSubmitting(false);
      setOpen(false);
      setFeedback("");
      setRating(0);
      toast({ title: "Thank you for your feedback!" });
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>We value your feedback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-text" className="block text-sm font-medium mb-1">Your feedback</label>
            <Textarea
              id="feedback-text"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Let us know your thoughts, suggestions, or issues..."
              required
              minLength={5}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} focus:outline-none`}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !feedback || rating === 0}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
