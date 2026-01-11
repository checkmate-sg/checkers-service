import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  name: string;
  imgSrc: string;
  stat: string;
}

export default function StatCard({ name, imgSrc, stat }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center pt-6">
        <img src={imgSrc} alt={name} className="w-16 h-16 rounded-full mx-auto mb-4" />
        <p className="text-4xl font-bold mb-2 text-primary">{stat}</p>
        <p className="text-muted-foreground">{name}</p>
      </CardContent>
    </Card>
  );
}
