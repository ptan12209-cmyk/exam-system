/**
 * Excel Export Utility
 * Exports submission data to Excel (.xlsx) format
 */

interface SubmissionData {
    index: number;
    fullName: string;
    email?: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    timeSpent: number;
    submittedAt: string;
}

interface ExamData {
    title: string;
    totalQuestions: number;
    duration: number;
}

/**
 * Format time in seconds to mm:ss
 */
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Format date to Vietnamese format
 */
const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

/**
 * Export submissions to Excel file (.xlsx)
 * Uses XLSX library if available, fallback to CSV
 */
export const exportToExcel = async (
    examData: ExamData,
    submissions: SubmissionData[]
): Promise<void> => {
    // Try to use xlsx library if available
    try {
        const XLSX = await import("xlsx");

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();

        // Header info
        const headerRows = [
            [`BẢNG ĐIỂM: ${examData.title}`],
            [`Số câu hỏi: ${examData.totalQuestions} | Thời gian: ${examData.duration} phút`],
            [`Xuất lúc: ${formatDate(new Date().toISOString())}`],
            [], // Empty row
        ];

        // Column headers
        const columnHeaders = ["STT", "Họ và tên", "Điểm", "Số đúng", "Thời gian làm", "Nộp lúc", "Xếp loại"];

        // Data rows
        const dataRows = submissions.map((sub) => {
            const grade = sub.score >= 8 ? "Giỏi" : sub.score >= 6.5 ? "Khá" : sub.score >= 5 ? "TB" : "Yếu";
            return [
                sub.index,
                sub.fullName,
                sub.score.toFixed(1),
                `${sub.correctCount}/${sub.totalQuestions}`,
                formatTime(sub.timeSpent),
                formatDate(sub.submittedAt),
                grade
            ];
        });

        // Statistics
        const avgScore = submissions.length > 0
            ? (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1)
            : "0";
        const passCount = submissions.filter(s => s.score >= 5).length;
        const highestScore = submissions.length > 0
            ? Math.max(...submissions.map(s => s.score)).toFixed(1)
            : "0";

        const statsRows = [
            [], // Empty row
            ["THỐNG KÊ"],
            ["Tổng số bài nộp", submissions.length],
            ["Điểm trung bình", avgScore],
            ["Số bài đạt (>=5)", `${passCount}/${submissions.length} (${submissions.length > 0 ? Math.round(passCount / submissions.length * 100) : 0}%)`],
            ["Điểm cao nhất", highestScore],
        ];

        // Combine all rows
        const allRows = [
            ...headerRows,
            columnHeaders,
            ...dataRows,
            ...statsRows
        ];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(allRows);

        // Set column widths
        worksheet["!cols"] = [
            { wch: 5 },   // STT
            { wch: 25 },  // Họ tên
            { wch: 8 },   // Điểm
            { wch: 10 },  // Số đúng
            { wch: 12 },  // Thời gian
            { wch: 18 },  // Nộp lúc
            { wch: 8 },   // Xếp loại
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng điểm");

        // Generate file and download
        XLSX.writeFile(workbook, `diem-${examData.title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);

    } catch {
        // Fallback to CSV if xlsx not available
        console.log("xlsx library not available, falling back to CSV");
        exportToCSV(examData, submissions);
    }
};

/**
 * Export submissions to CSV file (fallback)
 */
export const exportToCSV = (
    examData: ExamData,
    submissions: SubmissionData[]
): void => {
    const headers = ["STT", "Họ tên", "Điểm", "Số đúng", "Thời gian", "Nộp lúc"];
    const rows = submissions.map((sub) => [
        sub.index,
        `"${sub.fullName}"`,
        sub.score.toFixed(1),
        `"${sub.correctCount}/${sub.totalQuestions}"`,
        formatTime(sub.timeSpent),
        `"${formatDate(sub.submittedAt)}"`
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    // Add BOM for Excel to recognize UTF-8
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diem-${examData.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};
