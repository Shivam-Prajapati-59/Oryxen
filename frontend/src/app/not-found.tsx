import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <h2 className="text-4xl font-bold">404</h2>
            <p className="text-muted-foreground">Page not found</p>
            <Button asChild variant="outline">
                <Link href="/">Go home</Link>
            </Button>
        </div>
    );
}
