import { ExperimentPage } from "@/components/experiment-page";

export default function HomePage({
  searchParams
}: {
  searchParams?: {
    condition?: string;
    uid?: string;
    return_url?: string;
  };
}) {
  return (
    <ExperimentPage
      condition={searchParams?.condition}
      uid={searchParams?.uid}
      returnUrl={searchParams?.return_url}
    />
  );
}
