import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface ResponsivePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];

  // Always show first page
  pages.push(1);

  if (current <= 3) {
    // Near start: show 1, 2, 3, 4, ..., last
    for (let i = 2; i <= Math.min(4, total - 1); i++) {
      pages.push(i);
    }
    if (total > 5) pages.push("ellipsis");
  } else if (current >= total - 2) {
    // Near end: show 1, ..., last-3, last-2, last-1, last
    if (total > 5) pages.push("ellipsis");
    for (let i = Math.max(total - 3, 2); i <= total - 1; i++) {
      pages.push(i);
    }
  } else {
    // Middle: show 1, ..., current-1, current, current+1, ..., last
    pages.push("ellipsis");
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push("ellipsis");
  }

  // Always show last page
  if (total > 1) pages.push(total);

  return pages;
}

export function ResponsivePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemLabel = "items",
}: ResponsivePaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      {/* Item count info */}
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        Showing {startItem} to {endItem} of {totalItems} {itemLabel}
      </p>

      {/* Pagination controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
        {/* First page button - hidden on very small screens */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>

        {/* Page numbers with truncation */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, idx) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs sm:text-sm"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button - hidden on very small screens */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
