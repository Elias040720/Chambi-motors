import { notFound } from "next/navigation";
import { validId } from "@/lib/http";
import TrackingView from "./view";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Seguimiento de servicio · CHAMBI MOTORS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Tracking({ params }: { params: Promise<{ id: string }> }) {
  // Never read credentials in the RSC tree. Data is obtained from the authorized JSON endpoint.
  try {
    const id = validId((await params).id);
    return <TrackingView id={id} />;
  } catch {
    notFound();
  }
}
