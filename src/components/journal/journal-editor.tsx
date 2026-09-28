"use client";

import { Trash2Icon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteJournalEntry, saveJournalEntry } from "@/app/actions/journal";
import { MoodPicker } from "@/components/journal/mood-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseTags } from "@/lib/journal";

type Entry = { body: string; mood: number | null; tags: string[] };

const PROMPTS = [
  "What went well today?",
  "How did training feel? Energy, sleep, soreness…",
  "What's one thing you'd do differently?",
];

export function JournalEditor({
  date,
  entry,
  prompt,
}: {
  date: string;
  entry: Entry | null;
  prompt: number;
}) {
  const saved = {
    body: entry?.body ?? "",
    mood: entry?.mood ?? null,
    tags: entry?.tags.join(", ") ?? "",
  };
  const [body, setBody] = useState(saved.body);
  const [mood, setMood] = useState(saved.mood);
  const [tags, setTags] = useState(saved.tags);
  const [pending, startTransition] = useTransition();
  const normalized = (t: string) => parseTags(t).sort().join(", ");
  const dirty = body !== saved.body || mood !== saved.mood || normalized(tags) !== normalized(saved.tags);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    startTransition(async () => {
      const result = await saveJournalEntry(date, { body, mood, tags });
      if (result.ok) {
        setTags(normalized(tags));
        toast.success("Entry saved");
      } else toast.error(result.error);
    });
  }

  function remove() {
    if (!confirm("Delete this entry?")) return;
    startTransition(async () => {
      await deleteJournalEntry(date);
      setBody("");
      setMood(null);
      setTags("");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel>Mood</FieldLabel>
        <MoodPicker value={mood} onChange={setMood} disabled={pending} />
      </Field>
      <Field>
        <FieldLabel htmlFor="journal-body">Entry</FieldLabel>
        <Textarea
          id="journal-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (dirty) save();
            }
          }}
          placeholder={PROMPTS[prompt % PROMPTS.length]}
          className="min-h-72 text-base leading-relaxed"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="journal-tags">Tags</FieldLabel>
        <Input
          id="journal-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="training, sleep, work"
        />
        <FieldDescription>Comma or space separated.</FieldDescription>
      </Field>
      <div className="flex items-center justify-between gap-2">
        {entry ? (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={pending}>
            <Trash2Icon /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {dirty ? "Unsaved changes · Ctrl+Enter to save" : entry ? "Saved" : ""}
          </span>
          <Button onClick={save} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}
