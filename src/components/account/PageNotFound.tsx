import React from "react";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/shadcn/ui/empty";

/** Account-area 404: the same shadcn Empty the list tables show with no rows. */
export const PageNotFound = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <FileQuestion />
      </EmptyMedia>
      <EmptyTitle>Page not found</EmptyTitle>
      <EmptyDescription>
        This page doesn’t exist or may have moved. Use the sidebar, or head
        back to your dashboard.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button asChild>
        <a href="/account">Back to dashboard</a>
      </Button>
    </EmptyContent>
  </Empty>
);
