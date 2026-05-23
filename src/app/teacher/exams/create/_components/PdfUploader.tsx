"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface PdfUploaderProps {
  uploadingPdf: boolean;
  pdfUrl: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PdfUploader({ uploadingPdf, pdfUrl, onUpload }: PdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
      <Label className="mb-2 block">Upload đề thi PDF</Label>
      <div className="flex gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={onUpload}
          className="rounded-xl"
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="rounded-full border-[hsl(var(--border))]/70 bg-transparent"
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        {uploadingPdf ? "Đang tải lên..." : pdfUrl ? "Đã upload PDF" : "Chưa có file"}
      </p>
    </div>
  );
}
