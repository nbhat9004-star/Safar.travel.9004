import '../explore.css';
import ExploreShell from '@/components/explore/ExploreShell';

export const metadata = {
  title: 'Explore — Safar',
  description: 'Discover destinations, plan journeys, meet travelers, share stories — powered by the community.',
};

export default function ExploreLayout({ children }) {
  return <ExploreShell>{children}</ExploreShell>;
}
