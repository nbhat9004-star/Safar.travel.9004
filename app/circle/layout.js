import './circle.css';

export const metadata = {
  title: 'Safar Circle — Create Journeys Worth Joining',
  description: 'Plan incredible trips. Invite amazing people. Book everything through trusted Safar hosts. Travel together.',
};

export default function CircleLayout({ children }) {
  return (
    <div className="circle-root min-h-screen">
      {children}
    </div>
  );
}
