import ExploreShell2 from '@/components/explore/ExploreShell2';

export const metadata = {
  title: 'Explore — Safar Curated',
  description: 'Publish and join community trips, chat with fellow travellers and unlock rewards — the Safar Explore experience.',
};

export default function ExploreLayout({ children }) {
  return <ExploreShell2>{children}</ExploreShell2>;
}
