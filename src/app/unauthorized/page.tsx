import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-checkmate-secondary">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Welcome to{" "}
            <span className="text-checkmate-primary">CheckMate Checkers</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            To get started, head to the Telegram bot and type:
          </p>
          <p className="text-xl font-mono bg-muted px-4 py-2 rounded-md inline-block">
            /onboard
          </p>
          <p className="text-sm text-muted-foreground">
            This will guide you through the onboarding process to become a
            checker.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
