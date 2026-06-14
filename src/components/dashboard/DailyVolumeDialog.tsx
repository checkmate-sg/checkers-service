"use client";

import { useEffect, useState } from "react";
import { Infinity as InfinityIcon, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useUpdateDailyVoteLimit } from "@/hooks/checkers/useUpdateDailyVoteLimit";
import { MAX_DAILY_VOTES, MIN_DAILY_VOTES } from "@/shared/constants";

// Snap points the slider locks onto. The slider works on the *index* of this
// array (even spacing per stop) rather than the raw number, so the gaps between
// 20/30/50 feel as deliberate as the gaps between 5/10. Lowest stop is the
// shared MIN_DAILY_VOTES so the slider can never emit an invalid value.
const STEPS = [MIN_DAILY_VOTES, 10, 20, 30, 50] as const;
const TOP_STEP = STEPS[STEPS.length - 1];

// "Receive every check" maps to MAX_DAILY_VOTES — a practical stand-in for "all"
// (exceeding it/day is unlikely). Since the slider only emits the STEPS values,
// a stored MAX_DAILY_VOTES unambiguously identifies a receive-all checker
// without a separate flag.
const RECEIVE_ALL_VALUE = MAX_DAILY_VOTES;

function nearestIndex(value: number): number {
  let best = 0;
  for (let i = 1; i < STEPS.length; i++) {
    if (Math.abs(STEPS[i] - value) < Math.abs(STEPS[best] - value)) best = i;
  }
  return best;
}

interface DailyVolumeDialogProps {
  checkerId: string;
  currentValue: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DailyVolumeDialog({
  checkerId,
  currentValue,
  open,
  onOpenChange,
}: DailyVolumeDialogProps) {
  const update = useUpdateDailyVoteLimit(checkerId);

  const [index, setIndex] = useState(() => nearestIndex(currentValue));
  const [receiveAll, setReceiveAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever the dialog (re)opens or the saved value changes, so we
  // never show a stale position after a previous save. Anything above the top
  // slider step means the checker is on receive-all.
  useEffect(() => {
    if (open) {
      setIndex(nearestIndex(currentValue));
      setReceiveAll(currentValue > TOP_STEP);
      setError(null);
    }
  }, [open, currentValue]);

  const selected = STEPS[index];
  const nextValue = receiveAll ? RECEIVE_ALL_VALUE : selected;
  const dirty = nextValue !== currentValue;

  const handleSave = async () => {
    setError(null);
    try {
      await update.mutateAsync(nextValue);
      onOpenChange(false);
    } catch {
      setError("Couldn't save. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] gap-0 overflow-hidden rounded-3xl border-orange-100 p-0 sm:max-w-sm">
        {/* Warm header band */}
        <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 px-6 pb-8 pt-6 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl"
          />
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-bold tracking-tight text-white">
              Choose your target load
            </DialogTitle>
            <DialogDescription className="text-sm text-orange-50/90">
              Roughly how many checks would you like each day?
            </DialogDescription>
          </DialogHeader>

          {/* Live value read-out */}
          <div className="mt-5 flex items-end gap-2">
            {receiveAll ? (
              <span className="flex items-center gap-2 text-4xl font-extrabold leading-none">
                <InfinityIcon className="h-9 w-9" strokeWidth={2.5} />
                <span className="text-base font-semibold text-orange-50/90">every check</span>
              </span>
            ) : (
              <>
                <span className="text-5xl font-extrabold leading-none tabular-nums">
                  {selected}
                </span>
                <span className="pb-1 text-sm font-medium text-orange-50/90">checks / day</span>
              </>
            )}
          </div>
        </div>

        {/* Slider + ticks */}
        <div className="space-y-6 px-6 pb-6 pt-7">
          <div
            className={
              receiveAll
                ? "pointer-events-none select-none opacity-40 transition-opacity"
                : "transition-opacity"
            }
          >
            <Slider
              value={[index]}
              min={0}
              max={STEPS.length - 1}
              step={1}
              onValueChange={([i]) => setIndex(i)}
              aria-label="Daily target load"
              aria-valuetext={`${selected} checks per day`}
              className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-[3px] [&_[role=slider]]:shadow-md"
            />
            {/* Tick labels, aligned to each snap point */}
            <div className="relative mt-3 h-5">
              {STEPS.map((step, i) => {
                const left = (i / (STEPS.length - 1)) * 100;
                const active = i === index;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setIndex(i)}
                    style={{ left: `${left}%` }}
                    className={`absolute -translate-x-1/2 text-xs tabular-nums transition-colors ${
                      active
                        ? "font-bold text-orange-600"
                        : "font-medium text-gray-400 hover:text-orange-400"
                    }`}
                  >
                    {step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receive-all toggle — saves MAX_DAILY_VOTES */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-800">Receive every check</p>
                <p className="text-xs text-gray-500">Get every message, no daily cap.</p>
              </div>
              <Switch
                checked={receiveAll}
                onCheckedChange={setReceiveAll}
                aria-label="Receive every check"
              />
            </div>
          </div>

          {error && <p className="text-center text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-gray-200"
              onClick={() => onOpenChange(false)}
              disabled={update.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
              onClick={handleSave}
              disabled={update.isPending || !dirty}
            >
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
