import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

interface HydrateQueriesOnServerProps {
  children: React.ReactNode;
  prepareQueries: (queryClient: QueryClient) => Promise<void>;
}

export default async function HydrateQueriesOnServerProps(
  props: Readonly<HydrateQueriesOnServerProps>
) {
  // return <>{props.children}</>

  const queryClient = new QueryClient();
  await props.prepareQueries(queryClient);

  return <HydrationBoundary state={dehydrate(queryClient)}>{props.children}</HydrationBoundary>;
}
