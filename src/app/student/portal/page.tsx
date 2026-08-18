import { redirect } from "next/navigation"

/** Legacy chooser kept as a stable URL; core-exam mode has one student home. */
export default function StudentPortalSelection() {
  redirect("/student/dashboard")
}
