import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EditableStatCardProps {
  name: string;
  imgSrc: string;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
}

export default function EditableStatCard({
  name,
  imgSrc,
  initialValue,
  onSave,
}: EditableStatCardProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const previousValue = value;

    try {
      await onSave(value);
    } catch (err) {
      setValue(previousValue);
      setError("Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center pt-6 gap-3">
        <img src={imgSrc} alt={name} className="w-16 h-16 rounded-full" />

        <input
          className="text-center text-2xl font-bold border rounded px-2 py-1 w-full"
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={saving}
        />

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="animate-spin" size={16} /> : "Update"}
        </Button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <p className="text-muted-foreground text-sm">{name}</p>
      </CardContent>
    </Card>
  );
}
