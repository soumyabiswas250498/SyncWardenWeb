import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => (
  <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
    <h1 className="text-4xl font-semibold">404</h1>
    <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
    <Button asChild>
      <Link to="/">Go home</Link>
    </Button>
  </div>
);

export default NotFoundPage;
