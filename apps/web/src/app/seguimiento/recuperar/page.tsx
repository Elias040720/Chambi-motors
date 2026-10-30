import RecoveryView from "./view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Recuperar seguimiento · CHAMBI MOTORS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RecoverTracking() {
  return <RecoveryView />;
}
